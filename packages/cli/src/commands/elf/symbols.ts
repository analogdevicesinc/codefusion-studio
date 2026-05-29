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
import {decimalToHex} from 'cfs-lib';

// import {SYMBOLS_TABLE_ID} from 'elf-parser'

import Table from 'cli-table3';
import {ElfFileParser} from 'elf-parser';

import {Logger} from '../../logger.js';
import {BaseCommand} from '../../utils/base-command.js';
import {tableOutputStyles} from '../../utils/utils.js';

// TODO move code to cfs-lib

type TSymbol = Record<string, number | string | undefined>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const formatQuery = (query: string) => {
  const paramValues: number[] = [];

  // Regex to find size or address with any operator and value (decimal or hexadecimal)
  const regex =
    /\b(size|address)\s*(=|<>|!=|>|<|>=|<=|==|LIKE)\s*(["']?(?:0x[\dA-Fa-f]+|\d+)["']?)\b/g;

  const modifiedQuery = query.replaceAll(
    regex,
    (_match, field, operator, value) => {
      const strippedValue = value.replaceAll(/["']/g, '');
      const numberIntValue = Number(strippedValue as number | string);
      paramValues.push(numberIntValue);

      return `${field} ${operator} ?`;
    }
  );

  return {modifiedQuery, paramValues};
};

const serializeSymbols = (symbols: TSymbol[]): TSymbol[] =>
  symbols?.map((symbol: TSymbol) => {
    const newSymbol: TSymbol = {...symbol}; // Copy symbol into newSymbol

    if (newSymbol?.size || newSymbol?.size === 0) {
      newSymbol.size = Number(newSymbol?.size);
    }

    if (newSymbol?.address || newSymbol?.address === 0) {
      newSymbol.address = decimalToHex(newSymbol?.address as number);
    }

    return newSymbol;
  });

export default class Symbols extends BaseCommand<typeof Symbols> {
  static args = {
    filePath: Args.string({description: 'file path  to read'}),
    sqlQuery: Args.string({description: 'Sql query to execute'})
  };

  static description = 'Query symbols contained within the ELF file';

  static flags = {
    full: Flags.boolean({char: 'f', description: 'Print full path'})
  };

  public async run(): Promise<{
    data: TSymbol[];
    RowsTotalNumber: number;
  }> {
    const {args, flags} = this;

    if (args.sqlQuery && args.filePath) {
      this.log(`SQL: ${args.sqlQuery}`);

      try {
        // const {modifiedQuery, paramValues} = formatQuery(args.sqlQuery)
        const parser = new ElfFileParser(args.filePath);
        await parser.initialize();
        const result: TSymbol[] = parser.query(
          args.sqlQuery || ''
        ) as TSymbol[];

        const dataResult = serializeSymbols(result || []);
        // eslint-disable-next-line unicorn/no-array-for-each
        dataResult.forEach((symbol: TSymbol) => {
          delete symbol.id;

          if (Number.isNaN(symbol.stack)) delete symbol.stack;

          if (symbol.recursive !== undefined) {
            const val = symbol.recursive as number;
            let str = val.toString();
            switch (val) {
              case 0: {
                str = '';
                break;
              }

              case 1: {
                str = 'R';
                break;
              } // ReachesRecursion

              case 2: {
                str = 'GL';
                break;
              } // GraphLoop

              case 3: {
                str = 'SR';
                break;
              } // SelfRecursive
            }

            symbol.recursive = str;
          }

          // Print just the name and the line
          if (
            !flags.full &&
            symbol.path !== undefined &&
            symbol.path !== null
          ) {
            const str = symbol.path as string;
            const fileNameAndLine = str.split(/\//).pop();
            if (fileNameAndLine) {
              const splits = fileNameAndLine.split(/:/);
              symbol.path =
                splits[0] + (splits[1] ? ':' + splits[1] : '');
            }
          }
        });

        if (
          dataResult !== undefined &&
          dataResult.length > 0 &&
          !this.jsonEnabled()
        ) {
          const table = new Table({
            head: Object.getOwnPropertyNames(dataResult[0]),
            ...tableOutputStyles()
          });

          for (const item of dataResult) {
            table.push(Object.values(item));
          }

          this.log(table.toString());
          this.log(`\nNumber of rows: ${dataResult.length}`);
        }

        return {data: dataResult, RowsTotalNumber: dataResult.length};
      } catch (error) {
        return Logger.logError(`${error}`);
      }
    } else {
      return Logger.logError(
        `No input file or query to execute. Please provide a valid file path and a valid query.`
      );
    }
  }
}
