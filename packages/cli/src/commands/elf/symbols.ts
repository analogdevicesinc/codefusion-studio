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
import Table from 'cli-table3';

import {BaseElfCommand} from '../../utils/base-elf-command.js';
import {tableOutputStyles} from '../../utils/utils.js';

// TODO move code to cfs-lib

type TSymbol = Record<string, number | string | undefined>;

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

export default class Symbols extends BaseElfCommand<typeof Symbols> {
  static args = {
    ...BaseElfCommand.args,
    sqlQuery: Args.string({
      description: 'Sql query to execute',
      required: true
    })
  };

  static description = 'Query symbols contained within the ELF file';
  static useResponseEnvelope = true;

  static flags = {
    full: Flags.boolean({
      charAliases: ['f'],
      deprecateAliases: true,
      description: 'Print full path'
    })
  };

  public async run(): Promise<{
    rows: TSymbol[];
    rowsTotalNumber: number;
  }> {
    const {args, flags} = this;

    this.log(`SQL: ${args.sqlQuery}`);

    const parser = await this.initializeParser();
    const result: TSymbol[] = parser.query(
      args.sqlQuery || ''
    ) as TSymbol[];

    const dataResult = serializeSymbols(result || []);
    for (const symbol of dataResult) {
      delete symbol.id;

      if (Number.isNaN(symbol.stack)) delete symbol.stack;

      if (symbol.recursive !== undefined) {
        const recursiveLabels: Record<number, string> = {
          0: '',
          1: 'R',
          2: 'GL',
          3: 'SR'
        };
        symbol.recursive =
          recursiveLabels[symbol.recursive as number] ??
          String(symbol.recursive);
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
    }

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

    return {rows: dataResult, rowsTotalNumber: dataResult.length};
  }
}
