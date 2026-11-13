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
/* eslint-disable complexity */
/* eslint-disable camelcase */
// TODO Proper import from src
import {Flags} from '@oclif/core';
import {
  ElfDataModel,
  ElfProgramHeader,
  ElfSectionHeader,
  HeaderInfo,
  convertHeaderBigIntsToNumber,
  decimalToHex,
  getBucket,
  mapArmAttributes,
  mapHeaderInfoData
} from 'cfs-lib';
import * as Enums from 'cfs-lib';

import {BaseCommand} from '../../utils/base-command.js';
import {BaseElfCommand} from '../../utils/base-elf-command.js';

const formatHeaderInfoIntoJsonStringData = (
  data: HeaderInfo[],
  separator: string = ' '
) => {
  for (const item of data) {
    const words = String(item.label).split(separator);

    for (let i = 0; i < words.length; i++) {
      words[i] =
        words[i][0].toUpperCase() + words[i].slice(1).toLowerCase();
    }

    item.label = words.join('');
  }
};

const formatHeaderInfoIntoCliStringData = (data: HeaderInfo[]) => {
  for (const item of data) {
    item.label = item.label.replace(/^Tag_/, '').replaceAll('_', ' ');
  }
};

const getMetadataHeaderInfo = (
  elfModel: ElfDataModel,
  isJson: boolean
) => {
  const elfHeaderObject = convertHeaderBigIntsToNumber(
    elfModel.elfHeader as unknown as Record<string, unknown>
  );
  // Remove FA object after mapping the data
  const elfHeaderArray = mapHeaderInfoData(elfHeaderObject).slice(1);
  if (isJson) {
    formatHeaderInfoIntoJsonStringData(elfHeaderArray);
  } else {
    formatHeaderInfoIntoCliStringData(elfHeaderArray);
  }

  return elfHeaderArray;
};

export default class Info extends BaseElfCommand<typeof Info> {
  static description = 'ELF parser CLI';
  static useResponseEnvelope = true;
  static flags = {
    // flag with a value (-n, --name=VALUE)
    // flag with no value (-f, --force)
    header: Flags.boolean({
      char: 'h',
      description: "print ELF's header info"
    }),
    attributes: Flags.boolean({
      char: 'a',
      description: "print ELF's attributes info"
    }),
    core: Flags.boolean({
      char: 'c',
      description: "print ELF's file basic info"
    }),
    fsize: Flags.boolean({
      char: 's',
      description: "print ELF's sizes info"
    }),
    nodb: Flags.boolean({
      char: 'n',
      description: 'do not populate the database',
      hidden: true
    }),
    verbose: Flags.boolean({
      ...BaseCommand.baseFlags.verbose,
      relationships: [
        {
          type: 'none',
          flags: [
            {
              name: 'format',
              when: async (flags) => flags.format === 'json'
            },
            'json'
          ]
        }
      ]
    }),

    debug_segments: Flags.boolean({
      description: "print ELF's segments",
      hidden: true
    }),
    debug_sections: Flags.boolean({
      description: "print ELF's sections",
      hidden: true
    }),
    debug_cus: Flags.boolean({
      description: 'print .debug_info compilation units',
      hidden: true
    }),
    debug_lt: Flags.boolean({
      description: 'print .debug_line section',
      hidden: true
    }),
    debug_abbrevs: Flags.boolean({
      description: 'print .debug_abbrev section',
      hidden: true
    }),
    debug_syms: Flags.boolean({
      description: 'print the symbols',
      hidden: true
    }),
    debug_dies: Flags.boolean({
      description: 'print DIE tree',
      hidden: true
    }),
    debug_heuristics: Flags.boolean({
      description: 'print heuristics',
      hidden: true
    })
  };

  public async run(): Promise<Record<string, unknown>> {
    const {flags} = this;

    const hasActionFlag =
      flags.header ||
      flags.attributes ||
      flags.core ||
      flags.fsize ||
      flags.debug_segments ||
      flags.debug_sections ||
      flags.debug_syms ||
      flags.debug_cus ||
      flags.debug_lt ||
      flags.debug_abbrevs ||
      flags.debug_dies ||
      flags.debug_heuristics;

    if (!hasActionFlag) {
      this.error(
        'No flags provided. Please provide at least one mandatory flag.'
      );
    }

    // These flags dump text with console.log inside cfs-lib, which would
    // corrupt the JSON envelope on stdout.
    if (
      this.jsonEnabled() &&
      (flags.debug_heuristics ||
        flags.debug_cus ||
        flags.debug_lt ||
        flags.debug_abbrevs ||
        flags.debug_dies)
    ) {
      this.error(
        'The --debug_heuristics, --debug_cus, --debug_lt, --debug_abbrevs and --debug_dies flags only support text output.',
        {code: 'ELF_INFO_UNSUPPORTED_JSON_FLAGS'}
      );
    }

    const result: Record<string, unknown> = {};
    const parser = await this.initializeParser(
      flags.nodb,
      flags.verbose
    );

    const md = parser.getDataModel();
    const headerInf = getMetadataHeaderInfo(md, this.jsonEnabled());

    if (flags.header) {
      const header: Record<string, number | string> = {};

      this.log(`\nHeader Info:`);
      for (const item of headerInf) {
        const itemVal = item.value.toString() || '';
        if (itemVal !== '') {
          header[item.label] =
            typeof item.value === 'number' ||
            item.label === 'HeaderSize'
              ? Number(itemVal)
              : itemVal;
          this.log(`${item.label}: ${item.value}`);
        }
      }

      result.Header = header;
    }

    if (flags.attributes) {
      if (md.elfArmAttributes) {
        const armAttributes = mapArmAttributes(
          md.elfArmAttributes as unknown as Record<
            symbol,
            number | string
          >
        );
        const attrNotNull = armAttributes.filter(
          (item) => item.value !== undefined && item.value !== null
        );

        if (this.jsonEnabled()) {
          formatHeaderInfoIntoJsonStringData(
            attrNotNull as HeaderInfo[],
            '_'
          );
        } else {
          formatHeaderInfoIntoCliStringData(
            attrNotNull as HeaderInfo[]
          );
        }

        const attrs: Record<string, number | string> = {};
        this.log(`\nAttributes Info:`);
        for (const item of attrNotNull) {
          if (item.value !== undefined && item.value !== null) {
            attrs[item.label] = item.value;
            this.log(`${item.label}: ${item.value}`);
          }
        }

        result.AttributesInfo = attrs;
      } else {
        this.log('ELF file has no ARM attributes');
      }
    }

    if (flags.core) {
      const dataToDisplay: string[] = [
        headerInf
          .find((item) => item.label === 'Class')
          ?.value.toString() || '',
        headerInf
          .find((item) => item.label === 'Data')
          ?.value.toString() || '',
        headerInf
          .find((item) => item.label === 'Type')
          ?.value.toString() || '',
        headerInf
          .find((item) => item.label === 'Machine')
          ?.value.toString() || '',
        headerInf
          .find((item) => item.label === 'OsAbi')
          ?.value.toString() || '',
        headerInf.find((item) => item.label === 'AbiVersion')
          ?.value === undefined
          ? ''
          : 'ABI Version ' +
            (
              headerInf.find((item) => item.label === 'AbiVersion')
                ?.value ?? ''
            ).toString(),
        headerInf.find((item) => item.label === 'AbiVersion')
          ?.value === 0
          ? 'statically linked'
          : '',
        md.elfSectionHeaders.some(
          (item) => item.shName === '.debug_info'
        )
          ? 'with debug_info'
          : 'with no debug_info',
        (md.elfSectionHeaders.some(
          (item) => item.shName === '.debug_info'
        ) ?? md.elfSectionHeaders.some((item) => item.type === 2))
          ? 'not stripped'
          : 'stripped'
      ];

      const fileInfo = dataToDisplay
        .filter((item) => item !== '')
        .join(', ');
      this.log(`\nFile Info:`);
      this.log(fileInfo);
      result.FileInfo = fileInfo;
    }

    if (flags.debug_heuristics) {
      md.getHeuristics().print();
    }

    if (flags.fsize) {
      const sizeData = new Map<string, number>();

      for (const section of md.elfSectionHeaders) {
        const bucket = getBucket(section.flags, section.type);
        if (bucket !== undefined && bucket !== '') {
          const current = sizeData.get(bucket) || 0;
          sizeData.set(bucket, current + Number(section.size));
        }
      }

      this.log(`\nSize Info:`);
      for (const [key, value] of sizeData) {
        this.log(`${key}: ${value}`);
      }

      result.SizeInfo = Object.fromEntries(sizeData);
    }

    if (flags.debug_segments) {
      for (const segment of md.elfProgramHeaders) {
        this.printSegment(md, segment);
      }
    }

    if (flags.debug_sections) {
      for (const section of md.elfSectionHeaders) {
        this.printSection(section);
      }
    }

    if (flags.debug_syms) {
      this.processSyms(md);
    }

    if (
      flags.debug_cus ||
      flags.debug_lt ||
      flags.debug_abbrevs ||
      flags.debug_dies
    ) {
      if (md.dw) {
        for (const cu of md.dw.compilationUnits) {
          cu.print(
            flags.debug_lt,
            flags.debug_abbrevs,
            flags.debug_dies
          );
        }
      } else {
        this.log('ELF file does not contain debugging information!');
      }
    }

    return result;
  }

  private printSection(section: ElfSectionHeader, prefix = '') {
    this.log(`${prefix}section "${section.shName}": `);
    this.log(`${prefix}  index: ${section.index}`);
    this.log(`${prefix}  name: ${section.name}`);
    this.log(`${prefix}  type: ${section.getTypeString()}`);
    this.log(
      `${prefix}  flags: ${section.flags} / "${section.getFlagsString()}"`
    );
    this.log(`${prefix}  addr: ${decimalToHex(section.address)}`);
    this.log(`${prefix}  offset: ${section.offset}`);
    this.log(`${prefix}  size: ${section.size}`);
    this.log(`${prefix}  link: ${section.link}`);
    this.log(`${prefix}  info: ${section.info}`);
    this.log(`${prefix}  addrAlign: ${section.addressAlignment}`);
    this.log(`${prefix}  entSize: ${section.entitySize}`);
  }

  private printSegment(md: ElfDataModel, segment: ElfProgramHeader) {
    this.log(`segment ${segment.index}: `);
    this.log(`  index: ${segment.index}`);
    this.log(`  type: ${Enums.ph_type[segment.type]}`);
    this.log(`  flags: ${segment.flags}`);
    this.log(`  offset: ${decimalToHex(segment.offset)}`);
    this.log(
      `  virtualAddress: ${decimalToHex(segment.virtualAddress)}`
    );
    this.log(
      `  physicalAddress: ${decimalToHex(segment.physicalAddress)}`
    );
    this.log(`  fileSize: ${segment.fileSize}`);
    this.log(`  memSize: ${segment.memorySize}`);
    this.log(`  alignment: ${segment.alignment}`);
    this.log(`  nSections: ${segment.sectionIndexList.length}`);
    for (const idx of segment.sectionIndexList) {
      this.printSection(md.elfSectionHeaders[idx], '    ');
    }
  }

  private processSyms(md: ElfDataModel) {
    let symidx = 0;
    let symDataIdx = 0;

    for (const sym of md.elfSymbols) {
      for (const symData of sym.symbolData) {
        const addr = Number(symData.value);
        let str =
          `sym[${symidx}][${symDataIdx}]: "${symData.nameStr}":` +
          (symData.demangledName
            ? ` demangled:"${symData.demangledName}"`
            : '') +
          (symData.demangledName
            ? ` demangSrc:"${symData.demangledNameSource}"`
            : '') +
          ` num:"${symData.index}"` +
          ` sec:` +
          (symData.sectionNameStr === null
            ? 'null'
            : `"${symData.sectionNameStr}"`) +
          ` addr:${decimalToHex(addr).toLowerCase()}` +
          ` type:${Enums.sym_type[symData.infoType]}` +
          (symData.stack === undefined
            ? ''
            : ` localStack:${symData.stack}`) +
          (symData.hasGraphStack
            ? ` graphStack:${symData.graphStack}`
            : '') +
          (symData.hasGraphStack && symData.callees.size > 0
            ? ` nCallees:${symData.callees.size}`
            : '') +
          (symData.hasGraphStack &&
          symData.recursiveType !==
            Enums.FunctionRecursiveType.NoRecursion
            ? ` recursive:${Enums.FunctionRecursiveType[symData.recursiveType]}`
            : '') +
          (symData.maxDepth === undefined
            ? ''
            : ` maxDepth:${symData.maxDepth}`) +
          ` size:${symData.size}`;
        if (symData.path) {
          str +=
            ` path:${symData.path}` +
            ` line:${symData.line}` +
            ` col:${symData.column}` +
            ` fromDies:${symData.fromDies}` +
            ` dbgAddress:${decimalToHex(symData.debugAddress)}` +
            (symData.debugAddress > 0
              ? ` diff:${addr - symData.debugAddress}`
              : '');
        }

        this.log(str);
        symDataIdx++;
      }

      symidx++;
    }
  } // processSyms
}
