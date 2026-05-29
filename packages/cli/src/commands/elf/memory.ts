/**
 *
 * Copyright (c) 2024-2026 Analog Devices, Inc.
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
import {Args, Flags} from '@oclif/core';
import {
  TExtendedSegment,
  TExtendedSymbol,
  TSegment,
  TSymbol,
  mapSections,
  mapSegments
} from 'cfs-lib';
import Table from 'cli-table3';
import {ElfFileParser} from 'elf-parser';
import {ElfDataModel} from 'elf-parser/dist/ElfDataModel.js';

import {Logger} from '../../logger.js';
import {BaseCommand} from '../../utils/base-command.js';
import {tableOutputStyles} from '../../utils/utils.js';

export interface MemoryFlags {
  [flag: string]: unknown;
  detail: boolean;
  id: number | undefined;
  name: string | undefined;
  section: boolean;
  segment: boolean;
  symbol: boolean;
}

export function generateMemoryJson(
  md: ElfDataModel,
  parser: ElfFileParser,
  flags: MemoryFlags,
  json: boolean
): string {
  let flagsCount: number =
    Number(flags.segment || 0) +
    Number(flags.symbol || 0) +
    Number(flags.section || 0);

  if (flagsCount === 0) {
    throw new Error(
      'No flags provided. Please use at least one mandatory flag.'
    );
  }

  let jsonString = '\n{\n';

  if (flags.segment) {
    ({flagsCount, jsonString} = formatSegment(
      md,
      parser,
      flags,
      flagsCount,
      jsonString,
      json
    ));
  }

  if (flags.section) {
    ({flagsCount, jsonString} = formatSection(
      md,
      parser,
      flags,
      flagsCount,
      jsonString,
      json
    ));
  }

  if (flags.symbol) {
    ({flagsCount, jsonString} = formatSymbol(
      md,
      parser,
      flags,
      flagsCount,
      jsonString,
      json
    ));
  }

  jsonString += '\n}\n';
  return jsonString;
}

export default class Memory extends BaseCommand<typeof Memory> {
  static args = {
    filePath: Args.string({description: 'file path  to read'})
  };

  static description =
    'View relationships between segments, sections and symbols\n' +
    'Note that this command can generate large amounts of output which might not be viewable in a terminal window. Consider piping the output to a file';

  static flags = {
    segment: Flags.boolean({
      char: 's',
      description: 'Lists of segments'
    }),
    section: Flags.boolean({
      char: 't',
      description: 'List of sections contained in each segment'
    }),
    symbol: Flags.boolean({
      char: 'y',
      description: 'List the symbols contained in each section'
    }),
    id: Flags.integer({
      char: 'i',
      description:
        ' Displays the sections/symbols contained in the specified segment/sections by id. Use only with -y or -t '
    }),
    name: Flags.string({
      char: 'n',
      description:
        ' Displays the sections/symbols contained in the specified segment/sections by name. Use only with -y'
    }),
    detail: Flags.boolean({
      char: 'd',
      description:
        'Print detailed information. Use alongside -s, -t, -y'
    })
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public async run(): Promise<any> {
    const {args, flags} = this;

    if (!args.filePath) {
      return Logger.logError(
        'No input file. Please provide a valid file path.'
      );
    }

    try {
      const parser = new ElfFileParser(args.filePath);
      await parser.initialize();
      const md = parser.getDataModel();

      const jsonString = generateMemoryJson(
        md,
        parser,
        flags,
        this.jsonEnabled()
      );

      return JSON.parse(jsonString);
    } catch (error) {
      return Logger.logError(`${error}`);
    }
  }
}

// eslint-disable-next-line max-params
function formatSymbol(
  md: ElfDataModel,
  parser: ElfFileParser,
  flags: {
    segment: boolean;
    section: boolean;
    symbol: boolean;
    id: number | undefined;
    name: string | undefined;
    detail: boolean;
  } & {[flag: string]: unknown},
  flagsCount: number,
  jsonString: string,
  json: boolean
) {
  let sections = mapSections(md.elfSectionHeaders, md, parser);
  if (flags.id !== undefined) {
    sections = sections.filter((item) => item.id === flags.id);
  }

  if (flags.name) {
    sections = sections.filter((item) => item.name === flags.name);
  }

  if (json) {
    --flagsCount;
    jsonString +=
      '"Sections":' +
      JSON.stringify(sections) +
      (flagsCount > 0 ? ',\n' : '\n');
  } else {
    let result: Array<unknown> = new Array<unknown>();
    for (const item of sections) {
      // eslint-disable-next-line unicorn/prefer-spread
      result = result.concat(
        item.symbols?.map((symbol: TSymbol) => ({
          section: item.name.toString(),
          sectionIndex: item.id,
          ...symbol,

          localstack: symbol?.localstack || null,
          stack: symbol?.stack || null
        }))
      );
    }

    if (result.length > 0) {
      const table = new Table({
        head: Object.getOwnPropertyNames(result[0]),
        colWidths: [20, 20],
        ...tableOutputStyles()
      });
      for (const item of result) {
        if (item !== undefined) {
          table.push(Object.values(item as TExtendedSymbol));
        }
      }

      console.log(table.toString());
    }
  }

  return {flagsCount, jsonString};
}

// eslint-disable-next-line max-params
function formatSection(
  md: ElfDataModel,
  parser: ElfFileParser,
  flags: {
    segment: boolean;
    section: boolean;
    symbol: boolean;
    id: number | undefined;
    name: string | undefined;
    detail: boolean;
  } & {[flag: string]: unknown},
  flagsCount: number,
  jsonString: string,
  json: boolean
) {
  let segments: TExtendedSegment[] = mapSegments(
    md.elfProgramHeaders,
    md,
    parser
  );
  if (segments.length > 0) {
    if (flags.id !== undefined) {
      segments = segments.filter((item) => item.id === flags.id);
    }

    let segmentsCount: number = segments.length;
    --flagsCount;
    for (const segment of segments) {
      let sectionsString: string = '';
      if (segment.sections) {
        for (const item of segment.sections) {
          if (flags.detail) {
            // eslint-disable-next-line unicorn/prefer-ternary
            if (json) {
              sectionsString += `\n { "name" => "${item.name}", "type": "${item.type}", "address": "${item.address}", "size": ${item.size}, "flags": "${item.flags}"},`;
            } else {
              sectionsString += `\n ${item.name} => type: ${item.type}, address: ${item.address}, size: ${item.size}, flags: ${item.flags}`;
            }
          } else {
            sectionsString += ' ' + item.name;
          }
        }
      }

      if (json) {
        --segmentsCount;
        if (flags.detail) {
          if (sectionsString.length > 0)
            sectionsString = sectionsString.slice(0, -1); // pop last char
          jsonString +=
            '"' +
            segment.id +
            '": [' +
            sectionsString +
            '\n]' +
            (flagsCount > 0 || segmentsCount > 0 ? ',' : '') +
            '\n';
        } else {
          jsonString +=
            '"' +
            segment.id +
            '":"' +
            sectionsString +
            (flagsCount > 0 || segmentsCount > 0 ? '",\n' : '"\n');
        }
      } else {
        console.log(`\nsegment ${segment.id}: ${sectionsString}`);
      }
    }
  }

  return {flagsCount, jsonString};
}

// eslint-disable-next-line max-params
function formatSegment(
  md: ElfDataModel,
  parser: ElfFileParser,
  flags: {
    segment: boolean;
    section: boolean;
    symbol: boolean;
    id: number | undefined;
    name: string | undefined;
    detail: boolean;
  } & {[flag: string]: unknown},
  flagsCount: number,
  jsonString: string,
  json: boolean
) {
  let segments = mapSegments(md.elfProgramHeaders, md, parser);
  if (segments.length > 0) {
    if (flags.id !== undefined) {
      segments = segments.filter((item) => item.id === flags.id);
    }

    const header: TSegment[] = JSON.parse(JSON.stringify(segments));

    // eslint-disable-next-line unicorn/no-array-for-each
    header.forEach((header: TExtendedSegment) => {
      delete header.sections;
    });
    if (json) {
      --flagsCount;
      jsonString +=
        '"Segments":' +
        JSON.stringify(header) +
        (flagsCount > 0 ? ',\n' : '\n');
    } else {
      const table = new Table({
        head: Object.getOwnPropertyNames(header[0]),
        colWidths: [20, 20],
        ...tableOutputStyles()
      });

      for (const item of header) {
        table.push(Object.values(item));
      }

      console.log(table.toString());
    }
  }

  return {flagsCount, jsonString};
}
