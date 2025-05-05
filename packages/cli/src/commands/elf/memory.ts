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
import {Args, Command, Flags} from '@oclif/core';
import {
  TExtendedSegment,
  TExtendedSymbol,
  TSegment,
  TSymbol,
  mapSections,
  mapSegments
} from 'cfs-lib';
import {ElfFileParser} from 'elf-parser';
import {ElfDataModel} from 'elf-parser/dist/ElfDataModel.js';

import {Logger} from '../../logger.js';

import Table = require('cli-table3');

export default class Memory extends Command {
  static args = {
    filePath: Args.string({description: 'file path  to read'})
  };

  static description =
    'View relationships between segments, sections and symbols';

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
    json: Flags.boolean({
      char: 'j',
      description: 'Export in JSON format. Use alongside -s, -t, -y'
    }),
    detail: Flags.boolean({
      char: 'd',
      description:
        'Print detailed information. Use alongside -s, -t, -y'
    })
  };

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Memory);

    let flagsCount: number =
      Number(flags.segment || 0) +
      Number(flags.symbol || 0) +
      Number(flags.section || 0);

    if (flagsCount === 0) {
      Logger.logError(
        'No flags provided. Please use at least one mandatory flag.'
      );
    }

    if (args.filePath) {
      try {
        const parser = new ElfFileParser(args.filePath);
        await parser.initialize();
        const md = parser.getDataModel();

        let jsonString = '\n{\n';

        if (flags.segment) {
          ({flagsCount, jsonString} = formatSegment(
            md,
            parser,
            flags,
            flagsCount,
            jsonString
          ));
        }

        if (flags.section) {
          ({flagsCount, jsonString} = formatSection(
            md,
            parser,
            flags,
            flagsCount,
            jsonString
          ));
        }

        if (flags.symbol) {
          ({flagsCount, jsonString} = formatSymbol(
            md,
            parser,
            flags,
            flagsCount,
            jsonString
          ));
        }

        jsonString += '\n}\n';
        if (flags.json) {
          console.log(JSON.parse(jsonString), null, 2);
        }
      } catch (error) {
        Logger.logError(`${error}`);
      }
    } else {
      Logger.logError(
        `No input file. Please provide a valid file path.`
      );
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
    json: boolean;
    detail: boolean;
  } & {[flag: string]: unknown} & {json: boolean | undefined},
  flagsCount: number,
  jsonString: string
) {
  let sections = mapSections(md.elfSectionHeaders, md, parser);
  if (flags.index) {
    sections = sections.filter((item) => item.id === flags.index);
  }

  if (flags.name) {
    sections = sections.filter((item) => item.name === flags.name);
  }

  if (flags.json) {
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
        colWidths: [20, 20]
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
    json: boolean;
    detail: boolean;
  } & {[flag: string]: unknown} & {json: boolean | undefined},
  flagsCount: number,
  jsonString: string
) {
  let segments: TExtendedSegment[] = mapSegments(
    md.elfProgramHeaders,
    md,
    parser
  );
  if (segments.length > 0) {
    if (flags.index) {
      segments = segments.filter((item) => item.id === flags.index);
    }

    let segmentsCount: number = segments.length;
    --flagsCount;
    for (const segment of segments) {
      let sectionsString: string = '';
      if (segment.sections) {
        for (const item of segment.sections) {
          if (flags.detail) {
            // eslint-disable-next-line unicorn/prefer-ternary
            if (flags.json) {
              sectionsString += `\n { "name" => "${item.name}", "type": "${item.type}", "address": "${item.address}", "size": ${item.size}, "flags": "${item.flags}"},`;
            } else {
              sectionsString += `\n ${item.name} => type: ${item.type}, address: ${item.address}, size: ${item.size}, flags: ${item.flags}`;
            }
          } else {
            sectionsString += ' ' + item.name;
          }
        }
      }

      if (flags.json) {
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
    json: boolean;
    detail: boolean;
  } & {[flag: string]: unknown} & {json: boolean | undefined},
  flagsCount: number,
  jsonString: string
) {
  const segments = mapSegments(md.elfProgramHeaders, md, parser);
  if (segments.length > 0) {
    const header: TSegment[] = JSON.parse(JSON.stringify(segments));

    // eslint-disable-next-line unicorn/no-array-for-each
    header.forEach((header: TExtendedSegment) => {
      delete header.sections;
    });
    if (flags.json) {
      --flagsCount;
      jsonString +=
        '"Segments":' +
        JSON.stringify(header) +
        (flagsCount > 0 ? ',\n' : '\n');
    } else {
      const table = new Table({
        head: Object.getOwnPropertyNames(header[0]),
        colWidths: [20, 20]
      });

      for (const item of header) {
        table.push(Object.values(item));
      }

      console.log(table.toString());
    }
  }

  return {flagsCount, jsonString};
}
