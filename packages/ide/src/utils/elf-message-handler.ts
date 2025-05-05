/**
 *
 * Copyright (c) 2024 Analog Devices, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
/* eslint-disable complexity */
import {
  convertHeaderBigIntsToStrings,
  getBucket,
  getFlags,
  getSegmentFlags,
  getSegmentTypes,
  mapArmAttributes,
  mapHeaderInfoData,
  decimalToHex,
} from "cfs-lib";
import { SYMBOLS_TABLE_ID } from "elf-parser";
import type { WebviewPanel } from "vscode";
import * as vscode from "vscode";

import type { ElfDataModel } from "elf-parser/src/ElfDataModel";
import type { ElfFileParser } from "elf-parser/src/ElfFileParser";
import type { ElfProgramHeader } from "elf-parser/src/ElfProgramHeader";
import type { ElfSectionHeader } from "elf-parser/src/ElfSectionHeader";
import type { ElfHeuristics } from "elf-parser/src/ElfHeuristics";
import { ELF_EXPLORER_COMMANDS } from "../commands/constants";

const SEGM_FLAG_READ_ONLY = "R";

type TSymbol = Record<string, number | string | bigint | undefined | null>;
type TFormat = "dec" | "hex";
type TDefaultFormatTable =
  | {
      memory: {
        1: {
          address: TFormat;
          size: TFormat;
        };
        2: {
          address: TFormat;
          size: TFormat;
        };
        3: {
          address: TFormat;
          size: TFormat;
        };
      };
      stats: {
        sections: TFormat;
        largestSym: TFormat;
      };
      symbols: {
        address: TFormat;
        size: TFormat;
        localstack: TFormat;
        stack: TFormat;
      };
    }
  | Record<string, unknown>;

const defaultListOfQueries: Array<{
  id: number;
  name: string;
  value: string;
}> = [
  {
    id: 4,
    name: "List every symbol in order",
    value: "SELECT * FROM symbols ORDER BY ID ASC",
  },
  {
    id: 3,
    name: "Select the name and size of each symbol in the 'bss' section",
    value:
      "SELECT name, size FROM symbols WHERE section REGEXP 'bss|.bss' and size > 0 order by size desc",
  },
  {
    id: 2,
    name: "Same query but restrict it to the 10 largest symbols",
    value:
      "SELECT name, section, size FROM symbols WHERE section REGEXP 'bss|.bss' ORDER BY size DESC LIMIT 10",
  },
  {
    id: 1,
    name: "Show 'Weak' symbols implemented in the ELF file",
    value: "SELECT * FROM symbols WHERE bind = 'WEAK'",
  },
  {
    id: 0,
    name: "Show symbols located in a specific source file: (not needed if we are dropping source files)",
    value: "SELECT * FROM symbols WHERE path LIKE '%main.c%'",
  },
];

const defaultFormatForTables: TDefaultFormatTable = {
  memory: {
    1: {
      address: "hex",
      size: "dec",
    },
    2: {
      address: "hex",
      size: "dec",
    },
    3: {
      address: "hex",
      size: "dec",
    },
  },
  stats: {
    sections: "dec",
    largestSym: "dec",
  },
  symbols: {
    address: "hex",
    size: "dec",
    localstack: "dec",
    stack: "dec",
  },
};

// Var used for sections mapped in segments
// the scope is to identify sections that can appear in 2 separate segments
let sectionRouteId = -1;
let symbolRouteId = -1;

const getMetadataHeaderInfo = (elfModel: ElfDataModel) => {
  const elfHeaderObject = convertHeaderBigIntsToStrings(
    elfModel.elfHeader as unknown as Record<string, unknown>,
  );

  // Remove FA object after mapping the data
  const elfHeaderArray = mapHeaderInfoData(elfHeaderObject).slice(1);

  return elfHeaderArray;
};

const getHeuristics = (heuristics: ElfHeuristics) => {
  const result: Array<Record<string, string>> = [
    {
      label: "Firmware Platform",
      value: heuristics.getTargetOs(),
    },
  ];

  heuristics.entries.forEach((item) => {
    result.push({
      label: item.name,
      value: item.stringValue,
    });
  });

  result.push({
    label: "Detected Compiler",
    value: heuristics.getCompilerDetected(),
  });

  return result;
};

/**
 * If the flags === 'R' then is READ ONLY, otherwise is executable (RE, RW, RWE, E)
 * @param segment
 * @returns
 */
export const isSegmReadOnly = (segmentFlags: string): boolean =>
  segmentFlags.toUpperCase() === SEGM_FLAG_READ_ONLY;

const populateSavedQueriesOnInit = async () => {
  await vscode.workspace
    .getConfiguration()
    .update(
      "elf.queries",
      defaultListOfQueries,
      vscode.ConfigurationTarget.Global,
    );
};

const saveDefaultFormatValuesForTables = async () => {
  await vscode.workspace
    .getConfiguration()
    .update(
      "elf.tableFormatNumbers",
      defaultFormatForTables,
      vscode.ConfigurationTarget.Global,
    );
};

export async function elfMessageHandler(
  message: any,
  elfExplorer: WebviewPanel,
  parser: ElfFileParser,
  elfModel: ElfDataModel,
) {
  let request;
  // TO DO: refactor file to receive only parser.query and mapped data

  /**
   * Serialize symbols from DB because there may be fields with typeof bigint or null
   * @param symbols
   * @returns
   */
  const serializeSymbols = (symbols: TSymbol[]): TSymbol[] =>
    symbols?.map((symbol: TSymbol) => {
      Object.keys(symbol).forEach((key) => {
        if (typeof symbol[key] === "bigint") {
          symbol[key] =
            symbol[key] || symbol[key] === 0n
              ? symbol[key]?.toString()
              : undefined;
        }
      });

      return {
        ...symbol,
        localstack:
          Object.prototype.hasOwnProperty.call(symbol, "localstack") &&
          elfModel.isLocalStackColumnAvailable()
            ? symbol.localstack === undefined
              ? null
              : symbol.localstack
            : undefined,
        stack:
          Object.prototype.hasOwnProperty.call(symbol, "stack") &&
          elfModel.isLocalStackColumnAvailable() &&
          symbol.stack === undefined
            ? null
            : symbol.stack,
        path:
          Object.prototype.hasOwnProperty.call(symbol, "path") &&
          elfModel.isPathColumnAvailable() &&
          symbol.path === undefined
            ? null
            : symbol.path,
        recursive: elfModel.isRecursiveColumnAvailable()
          ? symbol.recursive === undefined
            ? null
            : symbol.recursive
          : null,
        bucket: symbol?.section ? getBucketInfoForSymbol(symbol) : undefined,
        address:
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          symbol?.address || symbol?.address === 0
            ? decimalToHex(symbol?.address as number)
            : undefined,
      };
    });

  const getBucketInfoForSymbol = (dbSymbol: TSymbol): string => {
    let bucket = "";

    // The section in which the symbol is
    const foundSection = elfModel.elfSectionHeaders.find(
      (section) => section.getShNameString() === dbSymbol?.section,
    );

    if (foundSection) {
      bucket = getBucket(foundSection?.flags, foundSection?.type);
    }

    return bucket;
  };

  const getFormattedDbSymbols = async () => {
    const dbSymbols: TSymbol[] = (await parser.query(
      `SELECT * FROM ${SYMBOLS_TABLE_ID}`,
    )) as TSymbol[];

    return serializeSymbols(dbSymbols || []);
  };

  /**
   * The purpose of this method is to format the query which contains "size" or/and "address" fields, due to a bug in AlaSQL library
   * from "SELECT * FROM symbols WHERE size == 0" to "SELECT * FROM symbols WHERE size == ?" with paramValues === [0]
   * from "SELECT * FROM symbols WHERE address == 0xf" to "SELECT * FROM symbols WHERE address == ?" with paramValues === [15]
   * @param query
   * @returns - object containing the formatted query and an array of number values
   */
  const formatQueryWithStrictEquality = (query: string) => {
    const paramValues: number[] = [];
    // Regex to find size or address with any operator and value (decimal or hexadecimal)
    const regex =
      /\b(size|address)\s*(==|=)\s*(['"]?(?:0x[0-9a-fA-F]+|\d+)['"]?)\b/g;

    const modifiedQuery = query.replace(
      regex,
      (_match, field, operator, value) => {
        const strippedValue = value.replace(/['"]/g, "");
        const number = Number(strippedValue);
        paramValues.push(number);

        return `${field} ${operator} ?`;
      },
    );

    return { modifiedQuery, paramValues };
  };

  const filterSectionsBySegment = (indexList: number[]): ElfSectionHeader[] => {
    const filteredSections = elfModel.elfSectionHeaders.filter(
      (section: ElfSectionHeader) => {
        const found = indexList.find((index) => index === section.index);

        // 0 is falsy
        if (found !== undefined) return section;

        return undefined;
      },
    );

    return filteredSections;
  };

  const filterSymbolsBySection = (
    section: ElfSectionHeader,
    dbSymbols: TSymbol[],
  ) => {
    const result: TSymbol[] = [];

    for (const symSection of elfModel.elfSymbols) {
      for (const parserSymbol of symSection.symbolData) {
        if (parserSymbol.sectionHeaderIndex === section.index) {
          const dbSymbol: TSymbol | undefined = [...dbSymbols].find(
            (item: TSymbol) => item.id === parserSymbol.dbId,
          );

          if (dbSymbol) {
            symbolRouteId += 1;
            const clonedObj: TSymbol = JSON.parse(JSON.stringify(dbSymbol));
            clonedObj.routeId = symbolRouteId;
            result.push(clonedObj);
          }
        }
      }
    }

    return result;
  };

  const mapSections = (
    sections: ElfSectionHeader[],
    dbSymbols: TSymbol[],
    segmentFlags?: string | undefined,
  ) =>
    [...sections].map((section: ElfSectionHeader) => {
      sectionRouteId += 1;

      return {
        id: section.index,
        routeId: sectionRouteId,
        type: section.getTypeString(),
        address: decimalToHex(section?.address),
        size: section.size.toString(),
        symbols: filterSymbolsBySection(section, dbSymbols),
        name: section.shName,
        label: section.shName,
        flags: getFlags(section.flags),
        showAsReadOnly:
          // The logic is that if the segment, in which the section is part of, is read only then show section as read only
          segmentFlags ? isSegmReadOnly(segmentFlags) : false,
        bucket: getBucket(section.flags, section.type),
      };
    });

  const mapSegments = (segments: ElfProgramHeader[], dbSymbols: TSymbol[]) =>
    [...segments].map((segment: ElfProgramHeader) => ({
      id: segment.index,
      align: segment.alignment.toString(),
      flags: getSegmentFlags(segment.flags),
      showAsReadOnly: isSegmReadOnly(getSegmentFlags(segment.flags)),
      size: segment.memorySize.toString(),
      address: decimalToHex(segment?.virtualAddress),
      type: getSegmentTypes(segment.type),
      label: getSegmentTypes(segment.type),
      sections: mapSections(
        filterSectionsBySegment(segment.sectionIndexList),
        dbSymbols,
        getSegmentFlags(segment.flags),
      ),
    }));

  // Symbols Explorer
  if (message.type === "elf-get-symbols") {
    try {
      let result: TSymbol[] = [];
      const query: string = message?.body?.query || "";
      const { modifiedQuery, paramValues } =
        formatQueryWithStrictEquality(query);

      if (paramValues.length) {
        // There is a case when querying for strict equality ("==") for columns which are type BigInt,
        // that only works if the BigInt val is send as query param
        // ex: modifiedQuery = "SELECT * FROM symbols WHERE size == ?", paramValues = "144n"
        // update: BigInt was change to number for size and address, but this approach remains unchanged intentionally
        result = parser.query(modifiedQuery || "", paramValues) as TSymbol[];
      } else {
        // Identifies hexadecimal numbers and convert it in decimal
        const formattedQuery = query.replace(/0x[0-9a-fA-F]+/g, (match) =>
          parseInt(match, 16).toString(),
        );
        result = parser.query(formattedQuery || "") as TSymbol[];
      }

      request = Promise.resolve(serializeSymbols(result));
    } catch (error) {
      console.error(error);
      request = Promise.reject(error);
    }
  }

  // Saved information within VS Code
  if (message.type === "elf-get-queries") {
    try {
      let elfQueries:
        | Array<{ id: number; name: string; value: string }>
        | undefined = vscode.workspace.getConfiguration().get("elf.queries");

      // On first page load, populate the list of saved queries with default
      if (!elfQueries?.length) {
        await populateSavedQueriesOnInit();
        elfQueries = [...defaultListOfQueries];
      }

      request = Promise.resolve(elfQueries);
    } catch (error) {
      request = Promise.reject(error);
    }
  }

  if (message.type === "elf-update-queries") {
    try {
      const newQueries: Array<Record<string, string | number>> =
        message.body.queriesList;
      await vscode.workspace
        .getConfiguration()
        .update("elf.queries", newQueries, vscode.ConfigurationTarget.Global);
      const updatedQueries = vscode.workspace
        .getConfiguration()
        .get("elf.queries");
      request = Promise.resolve(updatedQueries);
    } catch (error) {
      request = Promise.reject(error);
    }
  }

  if (message.type === "elf-get-saved-options") {
    try {
      let savedOptions: TDefaultFormatTable | undefined = vscode.workspace
        .getConfiguration()
        .get("elf.tableFormatNumbers");

      savedOptions = savedOptions ? savedOptions : {};

      if (!Object.keys(savedOptions).length) {
        // On first app load, insert default values
        await saveDefaultFormatValuesForTables();

        savedOptions = defaultFormatForTables;
      }

      request = Promise.resolve(savedOptions);
    } catch (error) {
      request = Promise.reject(error);
    }
  }

  if (message.type === "elf-update-saved-options") {
    try {
      const updatedOptions: TDefaultFormatTable = message.body.options;

      await vscode.workspace
        .getConfiguration()
        .update(
          "elf.tableFormatNumbers",
          updatedOptions,
          vscode.ConfigurationTarget.Global,
        );

      request = Promise.resolve(updatedOptions);
    } catch (error) {
      request = Promise.reject(error);
    }
  }

  // Memory Layout
  if (message.type === "elf-get-memory-usage") {
    try {
      sectionRouteId = -1;
      symbolRouteId = -1;

      let dbSymbols: TSymbol[] = [];
      dbSymbols = await getFormattedDbSymbols();

      const segments = mapSegments(elfModel.elfProgramHeaders, dbSymbols);
      request = Promise.resolve(segments);
    } catch (error) {
      request = Promise.reject();
    }
  }

  // Metadata
  if (message.type === "elf-get-metadata") {
    try {
      const metadata = {
        header: getMetadataHeaderInfo(elfModel),
        armAttributes: elfModel.elfArmAttributes
          ? mapArmAttributes(
              elfModel.elfArmAttributes as unknown as Record<
                symbol,
                string | number
              >,
            )
          : [],
        heuristicInfo: elfModel.heuristics
          ? getHeuristics(elfModel.heuristics)
          : [],
      };

      request = Promise.resolve(metadata);
    } catch (error) {
      request = Promise.reject(error);
    }
  }

  // Statistics
  if (message.type === "elf-get-sections") {
    try {
      let dbSymbols: TSymbol[] = [];
      dbSymbols = await getFormattedDbSymbols();

      const sections = mapSections(elfModel.elfSectionHeaders, dbSymbols);

      request = Promise.resolve(sections);
    } catch (error) {
      request = Promise.reject(error);
    }
  }

  // Load Elf File
  if (message.type === "elf-load-file") {
    try {
      if (message?.body?.command === "loadElfFile")
        void vscode.commands.executeCommand(
          ELF_EXPLORER_COMMANDS.LOAD_ELF_FILE,
        );
    } catch (error) {
      throw new Error(`Unknown command: ${message.body.command}`);
    }
  }

  if (message.type === "elf-get-source") {
    try {
      const line = (message?.body?.position[0] as number) - 1; // Subtract 1 to convert to zero-based index
      const col = (message?.body?.position[1] as number) - 1; // Subtract 1 to convert to zero-based index
      const pos = new vscode.Position(line, col);
      const openPath = vscode.Uri.file(message?.body?.path as string);

      vscode.workspace.openTextDocument(openPath).then(
        (doc) => {
          vscode.window.showTextDocument(doc).then(
            (editor) => {
              // Line added - by having a selection at the same position twice, the cursor jumps there
              editor.selections = [new vscode.Selection(pos, pos)];

              // And the visible range jumps there too
              const range = new vscode.Range(pos, pos);
              editor.revealRange(range);
            },
            (error) => {
              console.error("Error showing text document:", error);
            },
          );
        },
        (error) => {
          console.error("Error opening file:", error);
        },
      );
    } catch (error) {
      throw new Error(`Unknown error: ${error as string}`);
    }
  }

  if (message.type === "elf-get-path") {
    const path = message?.body?.path;

    try {
      await vscode.workspace.fs.stat(vscode.Uri.file(path as string));
      request = Promise.resolve(true);
    } catch (error) {
      request = Promise.reject(error);
    }
  }

  if (message.type === "elf-show-error-message") {
    const error = message.body.err;
    await vscode.window.showErrorMessage(error);
    request = Promise.resolve(true);
  }

  if (message.type === "elf-show-info-message") {
    const info = message.body.info;
    await vscode.window.showInformationMessage(info);
    request = Promise.resolve(true);
  }

  if (request) {
    const { body, error } = await request.then(
      (body) => ({ body, error: undefined }),
      (error) => ({
        body: undefined,
        error: error?.message,
      }),
    );

    try {
      // Send result to the webview
      await elfExplorer.webview.postMessage({
        type: "api-response",
        id: message.id,
        body,
        error,
      });
    } catch (err) {
      request = Promise.reject(err);

      await elfExplorer.webview.postMessage({
        type: "api-response",
        id: message.id,
        body: undefined,
        error: err?.message,
      });

      await vscode.window.showErrorMessage(`Error: ${err?.message}`);
    }
  }
}
