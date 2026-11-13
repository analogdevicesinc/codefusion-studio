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
import {Flags} from '@oclif/core';
import {
  ElfDataModel,
  ElfFileParser,
  TExtendedSegment,
  TExtendedSymbol,
  TSegment,
  TSymbol,
  mapSections,
  mapSegments
} from 'cfs-lib';
import Table from 'cli-table3';

import {BaseElfCommand} from '../../utils/base-elf-command.js';
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

export function generateMemoryData(
  md: ElfDataModel,
  parser: ElfFileParser,
  flags: MemoryFlags
): Record<string, unknown> {
  return {
    ...(flags.segment && buildSegmentData(md, parser, flags)),
    ...(flags.section && buildSectionData(md, parser, flags)),
    ...(flags.symbol && buildSymbolData(md, parser, flags))
  };
}

export default class Memory extends BaseElfCommand<typeof Memory> {
  static description =
    'View relationships between segments, sections and symbols\n' +
    'Note that this command can generate large amounts of output which might not be viewable in a terminal window. Consider piping the output to a file';
  static useResponseEnvelope = true;

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

  public async run(): Promise<Record<string, unknown>> {
    const {flags} = this;

    if (!(flags.segment || flags.section || flags.symbol)) {
      this.error(
        'No flags provided. Please use at least one mandatory flag.'
      );
    }

    const parser = await this.initializeParser();
    const md = parser.getDataModel();

    if (this.jsonEnabled()) {
      return generateMemoryData(md, parser, flags);
    }

    this.printTextOutput(md, parser, flags);

    return {};
  }

  private printSectionText(
    md: ElfDataModel,
    parser: ElfFileParser,
    flags: MemoryFlags
  ) {
    let segments: TExtendedSegment[] = mapSegments(
      md.elfProgramHeaders,
      md,
      parser
    );

    if (segments.length === 0) return;

    if (flags.id !== undefined) {
      segments = segments.filter((item) => item.id === flags.id);
    }

    for (const segment of segments) {
      let sectionsString = '';
      if (segment.sections) {
        for (const item of segment.sections) {
          sectionsString += flags.detail
            ? `\n ${item.name} => type: ${item.type}, address: ${item.address}, size: ${item.size}, flags: ${item.flags}`
            : ' ' + item.name;
        }
      }

      this.log(`\nsegment ${segment.id}: ${sectionsString}`);
    }
  }

  private printSegmentTable(
    md: ElfDataModel,
    parser: ElfFileParser,
    flags: MemoryFlags
  ) {
    let segments = mapSegments(md.elfProgramHeaders, md, parser);

    if (segments.length === 0) return;

    if (flags.id !== undefined) {
      segments = segments.filter((item) => item.id === flags.id);
    }

    const header: TSegment[] = (segments as TExtendedSegment[]).map(
      ({sections: _sections, ...rest}) => rest
    );

    const table = new Table({
      head: Object.getOwnPropertyNames(header[0]),
      colWidths: [20, 20],
      ...tableOutputStyles()
    });

    for (const item of header) {
      table.push(Object.values(item));
    }

    this.log(table.toString());
  }

  private printSymbolTable(
    md: ElfDataModel,
    parser: ElfFileParser,
    flags: MemoryFlags
  ) {
    let sections = mapSections(md.elfSectionHeaders, md, parser);
    if (flags.id !== undefined) {
      sections = sections.filter((item) => item.id === flags.id);
    }

    if (flags.name) {
      sections = sections.filter((item) => item.name === flags.name);
    }

    const result: Array<unknown> = [];
    for (const item of sections) {
      const mapped = item.symbols?.map((symbol: TSymbol) => ({
        section: item.name.toString(),
        sectionIndex: item.id,
        ...symbol,
        localstack: symbol?.localstack || null,
        stack: symbol?.stack || null
      }));
      if (mapped) {
        result.push(...mapped);
      }
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

      this.log(table.toString());
    }
  }

  private printTextOutput(
    md: ElfDataModel,
    parser: ElfFileParser,
    flags: MemoryFlags
  ) {
    if (flags.segment) {
      this.printSegmentTable(md, parser, flags);
    }

    if (flags.section) {
      this.printSectionText(md, parser, flags);
    }

    if (flags.symbol) {
      this.printSymbolTable(md, parser, flags);
    }
  }
}

function buildSegmentData(
  md: ElfDataModel,
  parser: ElfFileParser,
  flags: MemoryFlags
): Record<string, unknown> {
  let segments = mapSegments(md.elfProgramHeaders, md, parser);
  if (segments.length === 0) return {};

  if (flags.id !== undefined) {
    segments = segments.filter((item) => item.id === flags.id);
  }

  const header: TSegment[] = JSON.parse(JSON.stringify(segments));
  for (const h of header as TExtendedSegment[]) {
    delete h.sections;
  }

  return {Segments: header};
}

function buildSectionData(
  md: ElfDataModel,
  parser: ElfFileParser,
  flags: MemoryFlags
): Record<string, unknown> {
  let segments: TExtendedSegment[] = mapSegments(
    md.elfProgramHeaders,
    md,
    parser
  );
  if (segments.length === 0) return {};

  if (flags.id !== undefined) {
    segments = segments.filter((item) => item.id === flags.id);
  }

  const result: Record<string, unknown> = {};
  for (const segment of segments) {
    if (flags.detail) {
      result[String(segment.id)] = segment.sections
        ? segment.sections.map((item) => ({
            name: item.name,
            type: item.type,
            address: item.address,
            size: item.size,
            flags: item.flags
          }))
        : [];
    } else {
      result[String(segment.id)] = segment.sections
        ? segment.sections.map((item) => item.name).join(' ')
        : '';
    }
  }

  return result;
}

function buildSymbolData(
  md: ElfDataModel,
  parser: ElfFileParser,
  flags: MemoryFlags
): Record<string, unknown> {
  let sections = mapSections(md.elfSectionHeaders, md, parser);
  if (flags.id !== undefined) {
    sections = sections.filter((item) => item.id === flags.id);
  }

  if (flags.name) {
    sections = sections.filter((item) => item.name === flags.name);
  }

  return {Sections: sections};
}
