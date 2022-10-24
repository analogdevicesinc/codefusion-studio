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
/* eslint-disable camelcase */
// TODO Proper import from src
import {Args, Command, Flags} from '@oclif/core';
import {
  HeaderInfo,
  convertHeaderBigIntsToNumber,
  decimalToHex,
  getBucket,
  mapArmAttributes,
  mapHeaderInfoData
} from 'cfs-lib';
import {ElfFileParser} from 'elf-parser';
import {Dwarf} from 'elf-parser/dist/Dwarf.js';
import {DwarfData} from 'elf-parser/dist/DwarfData.js';
import {DwarfDie} from 'elf-parser/dist/DwarfDie.js';
import {ElfDataModel} from 'elf-parser/dist/ElfDataModel.js';
import {ElfProgramHeader} from 'elf-parser/dist/ElfProgramHeader.js';
import {ElfSectionHeader} from 'elf-parser/dist/ElfSectionHeader.js';
import * as Enums from 'elf-parser/dist/enums.js';

const formaHeaderInfoIntoJsonStringData = (
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
    formaHeaderInfoIntoJsonStringData(elfHeaderArray);
  } else {
    formatHeaderInfoIntoCliStringData(elfHeaderArray);
  }

  return elfHeaderArray;
};

export default class Info extends Command {
  static args = {
    filePath: Args.string({description: 'file path to read'})
  };

  static description = 'ELF parser CLI';
  static flags = {
    // flag with a value (-n, --name=VALUE)
    json: Flags.boolean({
      char: 'j',
      description: 'export to JSON format'
    }),
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
      description: 'do not populate the database'
    }),
    debug_segments: Flags.boolean({
      description: "print ELF's segments"
    }),
    debug_sections: Flags.boolean({
      description: "print ELF's sections"
    }),
    debug_cu: Flags.boolean({
      description: 'print .debug_info compilation units'
    }),
    debug_lt: Flags.boolean({
      description: 'print .debug_line section'
    }),
    debug_abbrevs: Flags.boolean({
      description: 'print .debug_abbrev section'
    }),
    debug_syms: Flags.boolean({description: 'print the symbols'}),
    debug_dies: Flags.boolean({description: 'print DIE tree'}),
    debug_heuristics: Flags.boolean({
      description: 'print heuristics'
    }),
    verbose: Flags.boolean({
      char: 'v',
      description: 'enable verbose mode'
    })
  };

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Info);

    if (args.filePath) {
      // this.log(`Input file path: ${args.filePath}`)

      const parser = new ElfFileParser(args.filePath);
      await parser.initialize(
        flags.nodb || false,
        flags.verbose || false
      );

      const md = parser.getDataModel();
      const headerInf = getMetadataHeaderInfo(md, flags.json);

      let isActionSet: boolean = false;
      let flagsCount: number =
        Number(flags.header || 0) +
        Number(flags.core || 0) +
        Number(flags.fsize || 0) +
        Number(flags.nodb || 0) +
        Number(flags.attributes || 0) +
        Number(flags.debug_segments || 0) +
        Number(flags.debug_sections || 0) +
        Number(flags.debug_cu || 0) +
        Number(flags.debug_lt || 0) +
        Number(flags.debug_abbrevs || 0) +
        Number(flags.debug_syms || 0) +
        Number(flags.debug_dies || 0) +
        Number(flags.debug_heuristics || 0) +
        Number(flags.verbose || 0) +
        0;
      let jsonString: string = '{\n ';
      if (flags.header) {
        isActionSet = true;

        if (flags.json) {
          jsonString += '"Header": {';
          for (const item of headerInf) {
            const itemVal: string = item.value.toString() || '';
            if (itemVal !== '') {
              const strValue: string =
                typeof item.value === 'number' ||
                item.label === 'HeaderSize'
                  ? itemVal
                  : '"' + itemVal + '"';
              jsonString += '\n\t"' + item.label + '":' + strValue;
              const lstIndex = headerInf.length - 1;
              if (lstIndex > 0 && headerInf.at(lstIndex) !== item) {
                jsonString += ',';
              }
            }
          }

          --flagsCount;
          jsonString += flagsCount > 0 ? '\n\t},\n' : '\n\t}\n';
        } else {
          this.log(`\nHeader Info:`);
          for (const item of headerInf) {
            this.log(`${item.label}: ${item.value}`);
          }
        }
      }

      if (flags.attributes) {
        isActionSet = true;
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

          if (flags.json) {
            formaHeaderInfoIntoJsonStringData(
              attrNotNull as HeaderInfo[],
              '_'
            );
            jsonString += '"AttributesInfo": {';
            const lstIndex = attrNotNull.length - 1;

            for (const item of attrNotNull) {
              if (item.value !== undefined && item.value !== null) {
                const itemVal: string = item.value.toString() || '';
                const strValue: string =
                  typeof item.value === 'number'
                    ? itemVal
                    : '"' + itemVal + '"';
                jsonString += '\n\t"' + item.label + '":' + strValue;
                if (
                  lstIndex > 0 &&
                  attrNotNull.at(lstIndex) !== item
                ) {
                  jsonString += ',';
                }
              }
            }

            --flagsCount;
            jsonString += flagsCount > 0 ? '\n\t},\n' : '\n\t}\n';
          } else {
            formatHeaderInfoIntoCliStringData(
              attrNotNull as HeaderInfo[]
            );
            this.log(`\nAttributes Info:`);
            for (const item of attrNotNull) {
              this.log(`${item.label}: ${item.value}`);
            }
          }
        } else if (!flags.json) {
          this.log('ELF file has no ARM attributes');
        }
      }

      if (flags.core) {
        isActionSet = true;
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
          md.elfSymbols.some(
            (item) => item.sectionTable.shName === '.debug_info'
          )
            ? 'with debug_info'
            : 'with no debug_info',
          (md.elfSymbols.some(
            (item) => item.sectionTable.shName === '.debug_info'
          ) ??
          md.elfSymbols.some((item) => item.sectionTable.type === 2))
            ? 'not stripped'
            : 'stripped'
        ];

        if (flags.json) {
          jsonString += '"FileInfo": "';
          for (const item of dataToDisplay) {
            jsonString += item;
            const lstIndex = dataToDisplay.length - 1;

            if (lstIndex > 0 && dataToDisplay.at(lstIndex) !== item) {
              jsonString += ', ';
            }
          }

          --flagsCount;
          jsonString += flagsCount > 0 ? '",\n' : '"\n';
        } else {
          let data: string = '';
          this.log(`\nFile Info:`);
          for (let i = 0; i < dataToDisplay.length; i++) {
            const item = dataToDisplay[i];
            if (item !== '') {
              data += item;
              if (i !== dataToDisplay.length - 1) {
                data += ', ';
              }
            }
          }

          this.log(`${data}`);
        }
      }

      if (flags.debug_heuristics) {
        isActionSet = true;
        const heuristics = md.getHeuristics();
        console.log(
          `Heuristics: Firmware Platform: ${heuristics.getTargetOs()}`
        );

        for (const [k, v] of heuristics.getSymbolEntries()) {
          console.log(
            `Heuristics: syms: "${k}": "${v.stringValue}" / raw: ${v.value}`
          );
        }
      }

      if (flags.fsize) {
        isActionSet = true;
        const data = new Map<string, number>();

        for (const section of md.elfSectionHeaders) {
          const bucket = getBucket(section.flags, section.type);
          if (bucket !== undefined && bucket !== '') {
            if (data.has(bucket)) {
              let val: number = data.get(bucket) || 0;
              val += Number(section.size);
              data.set(bucket, val);
            } else {
              data.set(bucket, Number(section.size));
            }
          }
        }

        if (flags.json) {
          jsonString += '"SizeInfo": {';
          for (const item of data) {
            jsonString += '\n\t"' + item[0] + '":' + item[1];
            if ([...data][data.size - 1][0] !== item[0]) {
              jsonString += ',';
            }
          }

          jsonString += '\n\t}\n';
        } else {
          this.log(`\nSize Info:`);
          for (const [key, value] of data) {
            this.log(`${key}: ${value}`);
          }
        }
      }

      if (flags.debug_segments) {
        isActionSet = true;
        for (const segment of md.elfProgramHeaders) {
          this.printSegment(md, segment);
        }
      }

      if (flags.debug_sections) {
        isActionSet = true;
        for (const section of md.elfSectionHeaders) {
          this.printSection(section);
        }
      }

      if (flags.debug_syms) {
        isActionSet = true;
        this.processSyms(md);
      }

      if (
        flags.debug_cu ||
        flags.debug_lt ||
        flags.debug_abbrevs ||
        flags.debug_dies
      ) {
        isActionSet = true;
        this.processCompilationUnits(
          md,
          flags.debug_lt,
          flags.debug_abbrevs,
          flags.debug_dies
        );
      }

      if (isActionSet && flags.json) {
        jsonString += '\n}';
        this.log(JSON.stringify(JSON.parse(jsonString), null, 2));
      }

      if (!isActionSet) {
        this.log(
          ` No flags provided  \n Use --help to print usage info`
        );
      }
    } else {
      this.log(
        ` No input file, bye! \n Use --help to print usage info`
      );
    }
  }

  private dumpDie(
    self: Info,
    cu: Dwarf.CompilationUnit,
    die: DwarfDie.Die,
    depth: number
  ) {
    self.log(
      `<${depth}><${decimalToHex(die.getSectionOffset())}> DIE tag:${DwarfData.DW_TAG[die.tag]} acode:${die.abbrev.code} children:${die.abbrev.children}`
    );
    if (die.path) {
      this.log(
        `path: "${die.path}" line:${die.line} col:${die.column}`
      );
    }

    if (die.ranges) {
      for (const r of die.ranges) {
        this.log(
          `range: [${decimalToHex(r.low)} ... ${decimalToHex(r.high)}]`
        );
      }
    }

    for (const spec of die.abbrev.attributes) {
      let str = `DIE attr: name:${DwarfData.DW_AT[spec.name]} form:${DwarfData.DW_FORM[spec.form]}`;

      const lt = cu.getLineTable();

      let val = null;
      switch (spec.form) {
        case DwarfData.DW_FORM.string:
        case DwarfData.DW_FORM.strp: {
          val = `"${die.getValue(spec.name).asString()}"`;
          break;
        }

        case DwarfData.DW_FORM.addr: {
          val = `${decimalToHex(die.getValue(spec.name).asAddress())}`;
          break;
        }

        case DwarfData.DW_FORM.data1:
        case DwarfData.DW_FORM.data2:
        case DwarfData.DW_FORM.data4: {
          val = die.getValue(spec.name).asUConstant();
          break;
        }

        case DwarfData.DW_FORM.exprloc: {
          try {
            val = `${decimalToHex(die.getValue(spec.name).asExprLock().evaluate([]).value)}`;
          } catch (error) {
            self.log(
              `ERROR: Cannot parse value for DIE name:${DwarfData.DW_AT[spec.name]} form:${DwarfData.DW_FORM[spec.form]}: ${error}`
            );
            val = 'NOT IMPLEMENTED!';
          }

          break;
        }
      }

      str += ` = ${val}`;

      const valn = val as number;
      switch (spec.name) {
        case DwarfData.DW_AT.decl_file: {
          if (lt && lt.fileNames.length > valn) {
            str += ' / ';
            str += lt.fileNames[valn].path;
          }

          break;
        }

        case DwarfData.DW_AT.decl_line:
        case DwarfData.DW_AT.decl_column: {
          break;
        }
      }

      self.log(str);
    }
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

  private processCompilationUnits(
    md: ElfDataModel,
    doLineTables: boolean,
    doAbbrevs: boolean,
    doDies: boolean
  ) {
    if (!md.dw) {
      this.log('ELF file does not contain debugging information!');
      return;
    }

    let i = 0;
    for (const cu of md.dw.compilationUnits) {
      this.log(
        `CU[${i}]: version:${cu.version}` +
          ` size:${cu.size}` +
          ` abbrev_offset:${cu.abbrevOffset}` +
          ` address_size:${cu.addressSize}` +
          ` nDies:${cu.dies.length}` +
          ` pc:[${decimalToHex(cu.lowPc)} ... ${decimalToHex(cu.highPc)}]`
      );

      if (doLineTables) {
        const lt = cu.getLineTable();
        if (lt) {
          this.log('CU lines:');
          this.log('  cmp_dir:', lt.compDir);
          this.log('  line_base:' + lt.lineBase);
          this.log('  line_range:' + lt.lineRange);
          this.log('  opcode_base:' + lt.opcodeBase);

          this.log('  ' + lt.fileNames.length + ' file names:');
          let idx = 0;
          for (const f of lt.fileNames) {
            this.log(`  [${idx}]: ${f.path}`);
            idx++;
          }

          this.log(
            '  ' +
              lt.includeDirectories.length +
              ' include directories:'
          );
          idx = 0;
          for (const inc of lt.includeDirectories) {
            this.log(`  [${idx}]: ${inc}`);
            idx++;
          }

          this.log('  Address to entry map:');
          idx = 0;
          // for (const entry of lt.entries) { // slow. map is faster
          for (const [, entry] of lt.addressToEntryMap) {
            this.log(
              `  [${idx}]:` +
                ` path:${entry.file.path}` +
                ` line:${entry.line}` +
                ` col:${entry.column}` +
                ` stmt:${entry.isStmt}` +
                ` address:${decimalToHex(entry.address)}`
            );
            idx++;
          }
        } else {
          this.log('No DWARF line_table found!');
        }
      }

      if (doAbbrevs) {
        cu.forceAbbrevs();

        this.log('abbrevs_map:');
        for (const [key, value] of cu.abbrevsMap) {
          this.log(
            `  [${key}]:` +
              ` code:${value.code}` +
              ` tag:${DwarfData.DW_TAG[value.tag]}` +
              ` children:${value.children}` +
              ` nAttributes(${value.attributes.length})`
          );
          for (const spec of value.attributes) {
            this.log(
              `    name:${DwarfData.DW_AT[spec.name]} form:${DwarfData.DW_FORM[spec.form]}`
            );
          }
        }
      }

      if (doDies) {
        for (const die of cu.dies) {
          this.dumpDie(this, cu, die, die.depth);
        }
      }

      i++;
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
          ` num:"${symData.index}"` +
          ` sec:` +
          (symData.sectionNameStr === null
            ? 'null'
            : `"${symData.sectionNameStr}"`) +
          ` addr:${decimalToHex(addr)}` +
          ` type:${Enums.sym_type[symData.infoType]}` +
          (symData.stack === undefined
            ? ''
            : ` localStack:${symData.stack}`) +
          (symData.hasGraphStack
            ? ` graphStack:${symData.graphStack}`
            : '') +
          (symData.hasGraphStack &&
          symData.recursiveType !==
            Enums.FunctionRecursiveType.NoRecursion
            ? ` recursive:${Enums.FunctionRecursiveType[symData.recursiveType]}`
            : '') +
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
  } // processCompilationUnits
}
