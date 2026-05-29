/**
 *
 * Copyright (c) 2026 Analog Devices, Inc.
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
import type {
  Board,
  CorePart,
  Documentation,
  Package,
  SoC
} from 'cfs-ccm-lib';

import {Args, Flags} from '@oclif/core';
import Table from 'cli-table3';

import {BaseCommand} from '../../utils/base-command.js';
import {getSocCatalog} from '../../utils/catalog-manager.js';
import {RecoverableError} from '../../utils/recoverable-error.js';
import {tableOutputStyles} from '../../utils/utils.js';

/**
 * Public-facing board information without internal ids.
 */
type PublicBoard = {
  description: string;
  identifier: string;
  packages: string[];
  productUrl?: string;
};

/**
 * Public-facing core type information without internal ids.
 */
type PublicCoreType = {
  architecture: string;
  isa: string;
};

/**
 * Public-facing core information without internal ids.
 */
type PublicCorePart = {
  coreType: PublicCoreType;
  dataModelCoreID: string;
  description?: string;
  extensions: string[];
  primary: boolean;
  supportsTrustZone?: boolean;
  aiCompatible: boolean;
};

/**
 * Public-facing package information without internal ids.
 */
type PublicPackage = {
  description: string;
  identifier: string;
  packageType: string;
};

/**
 * Public-facing documentation information without internal ids.
 */
type PublicDocumentation = {
  name: string;
  url: string;
};

/**
 * Public-facing SoC output combining family name with filtered SoC properties without internal ids.
 */
type PublicSoCOutput = {
  name: string;
  description?: string;
  familyName?: string;
  cores?: PublicCorePart[];
  boards?: PublicBoard[];
  packages?: PublicPackage[];
  documentation?: PublicDocumentation[];
};

/**
 * Helper function that returns Yes or No string. Defaults to No when input is undefined
 * @param [input] - Boolean value
 * @returns Yes/No string
 */
const returnYesNo = (input?: boolean): 'No' | 'Yes' =>
  input ? 'Yes' : 'No';

export default class Info extends BaseCommand<typeof Info> {
  static aliases = ['soc:info'];

  static args = {
    soc: Args.string({
      description: 'SoC name (case-insensitive)',
      name: 'soc',
      required: true
    })
  };

  static description =
    'Display detailed information about a specific SoC from the catalog.';

  static examples = [
    '<%= config.bin %> <%= command.id %> MAX32660',
    '<%= config.bin %> <%= command.id %> MAX32660 --boards',
    '<%= config.bin %> <%= command.id %> MAX32660 --packages --cores',
    '<%= config.bin %> <%= command.id %> MAX32660 --docs --format=json'
  ];

  static flags = {
    boards: Flags.boolean({
      char: 'b',
      default: false,
      summary: 'Display supported boards for the SoC.'
    }),
    cores: Flags.boolean({
      char: 'c',
      default: false,
      summary: 'Display supported cores for the SoC.'
    }),
    docs: Flags.boolean({
      char: 'd',
      default: false,
      summary: 'Display documentation links for the SoC.'
    }),
    packages: Flags.boolean({
      char: 'p',
      default: false,
      summary: 'Display supported packages for the SoC.'
    })
  };

  async run() {
    const {args, flags, config} = this;

    const catalog = await getSocCatalog(config, false);
    const socs = await catalog.getAll();
    const soc = this.findSocByName(socs, args.soc);
    if (!soc) {
      throw new RecoverableError(
        `SoC '${args.soc}' not found in catalog`,
        {
          suggestion: 'Verify the SoC name is correct',
          run: 'cfsutil socs list'
        }
      );
    }
    // Print text output (automatically suppressed when --json or --format=json is used)

    this.printTextOutput(soc, flags);
    // Return data for JSON output
    return this.buildOutput(soc, flags);
  }

  /**
   * Build the output object based on selected flags.
   * @param soc - The SoC object to extract data from.
   * @param flags - Object containing boolean flags for which sections to include.
   * @returns Filtered SoC data based on the provided flags.
   */
  private buildOutput(
    soc: SoC,
    flags: {
      boards: boolean;
      cores: boolean;
      docs: boolean;
      packages: boolean;
    }
  ): PublicSoCOutput {
    const hasFilters =
      flags.boards || flags.cores || flags.docs || flags.packages;

    if (!hasFilters) {
      // Default output: description, family, cores, boards, packages
      return {
        name: soc.name,
        description: soc.description,
        familyName: soc.family?.name,
        cores: soc.cores.map((core) => this.filterCore(core)),
        boards: soc.boards.map((board) =>
          this.filterBoard(board, soc.packages)
        ),
        packages: soc.packages.map((pkg) => this.filterPackage(pkg))
      };
    }

    // Selective output based on flags
    const output: PublicSoCOutput = {
      name: soc.name
    };

    if (flags.boards) {
      output.boards = soc.boards.map((board) =>
        this.filterBoard(board, soc.packages)
      );
    }

    if (flags.cores) {
      output.cores = soc.cores.map((core) => this.filterCore(core));
    }

    if (flags.docs) {
      output.documentation = soc.documentation?.map((doc) =>
        this.filterDocumentation(doc)
      );
    }

    if (flags.packages) {
      output.packages = soc.packages.map((pkg) =>
        this.filterPackage(pkg)
      );
    }

    return output;
  }

  /**
   * Filter board data to remove internal properties and resolve package names.
   * @param board - The board object to filter.
   * @param packages - Array of packages for lookup.
   * @returns Public-facing board object without internal properties.
   */
  private filterBoard(
    board: Board,
    packages: Package[]
  ): PublicBoard {
    // Resolve package IDs to data model package IDs
    const packageNames = (board.packageIDs || [])
      .map((pkgId) => {
        const pkg = packages.find((p) => p.id === pkgId);
        return pkg?.dataModelPackageID;
      })
      .filter((name): name is string => name !== undefined);

    return {
      description: board.description,
      identifier: board.name,
      packages: packageNames,
      productUrl: board.productUrl
    };
  }

  /**
   * Filter core data to remove internal ids.
   * @param core - The core part object to filter.
   * @returns Public-facing core object without internal ids.
   */
  private filterCore(core: CorePart): PublicCorePart {
    return {
      coreType: {
        architecture: core.coreType.architecture,
        isa: core.coreType.isa
      },
      dataModelCoreID: core.dataModelCoreID,
      description: core.description,
      extensions: core.extensions,
      primary: core.primary,
      supportsTrustZone: core.supportsTrustZone,
      aiCompatible: core.supportsAI ?? false
    };
  }

  /**
   * Filter documentation data to remove internal ids.
   * @param doc - The documentation object to filter.
   * @returns Public-facing documentation object without internal ids.
   */
  private filterDocumentation(
    doc: Documentation
  ): PublicDocumentation {
    return {
      name: doc.name,
      url: doc.url
    };
  }

  /**
   * Filter package data to remove internal ids.
   * @param pkg - The package object to filter.
   * @returns Public-facing package object without internal ids.
   */
  private filterPackage(pkg: Package): PublicPackage {
    return {
      description: pkg.description,
      identifier: pkg.dataModelPackageID,
      packageType: pkg.packageType
    };
  }

  /**
   * Find a SoC by name (case-insensitive).
   * @param socs - Array of SoC objects to search through.
   * @param name - The name of the SoC to find.
   * @returns The matching SoC object, or undefined if not found.
   */
  private findSocByName(socs: SoC[], name: string): SoC | undefined {
    const lowerName = name.toLowerCase();
    return socs.find((soc) => soc.name.toLowerCase() === lowerName);
  }

  /**
   * Format boards for text output.
   * @param boards - Array of board objects to format.
   * @param packages - Array of packages for lookup.
   * @returns Formatted table string showing board information.
   */
  private formatBoardsText(
    boards: Board[] | undefined,
    packages: Package[]
  ): string {
    if (!boards || boards.length === 0) {
      return 'No boards available.';
    }

    const table = new Table({
      head: ['Identifier', 'Packages', 'Description'],
      colWidths: [null, null, 60],
      wordWrap: true,
      ...tableOutputStyles()
    });

    for (const board of boards) {
      const description = board.description ?? '-';

      // Resolve package IDs to data model package IDs
      const packageNames = (board.packageIDs ?? [])
        .map((pkgId) => {
          const pkg = packages.find((p) => p.id === pkgId);

          return pkg?.dataModelPackageID;
        })
        .filter((name): name is string => name !== undefined);

      const packagesStr =
        packageNames.length > 0 ? packageNames.join(', ') : '-';

      table.push([board.name, packagesStr, description]);
    }

    return table.toString();
  }

  /**
   * Format cores for text output.
   * @param cores - Array of core part objects to format.
   * @returns Formatted table string showing core information.
   */
  private formatCoresText(cores: CorePart[]): string {
    if (cores.length === 0) {
      return 'No cores available.';
    }

    const table = new Table({
      head: [
        'Identifier',
        'Architecture',
        'ISA',
        'Primary',
        'TrustZone',
        'AI Compatible'
      ],
      ...tableOutputStyles()
    });

    for (const core of cores) {
      table.push([
        core.dataModelCoreID || '-',
        core.coreType?.architecture || '-',
        core.coreType?.isa || '-',
        returnYesNo(core.primary),
        returnYesNo(core.supportsTrustZone),
        returnYesNo(core.supportsAI)
      ]);
    }

    return table.toString();
  }

  /**
   * Format documentation for text output.
   * @param documentation - Array of documentation objects to format, or undefined.
   * @returns Formatted string showing documentation links.
   */
  private formatDocumentationText(
    documentation: Documentation[] | undefined
  ): string {
    if (!documentation || documentation.length === 0) {
      return 'No documentation available.';
    }

    return documentation
      .map((doc) => `${doc.name}: ${doc.url}`)
      .join('\n\n');
  }

  /**
   * Format packages for text output.
   * @param packages - Array of package objects to format.
   * @returns Formatted table string showing package information.
   */
  private formatPackagesText(
    packages: Package[] | undefined
  ): string {
    if (!packages || packages.length === 0) {
      return 'No packages available.';
    }

    const table = new Table({
      head: ['Identifier', 'Type', 'Description'],
      ...tableOutputStyles()
    });

    for (const pkg of packages) {
      table.push([
        pkg.dataModelPackageID,
        pkg.packageType || '-',
        pkg.description || '-'
      ]);
    }

    return table.toString();
  }

  /**
   * Print output in text format.
   * @param soc - The SoC object to display.
   * @param flags - Object containing boolean flags for which sections to display.
   * @returns void
   */
  private printTextOutput(
    soc: SoC,
    flags: {
      boards: boolean;
      cores: boolean;
      docs: boolean;
      packages: boolean;
    }
  ): void {
    const hasFilters =
      flags.boards || flags.cores || flags.docs || flags.packages;

    if (!hasFilters) {
      // Default output
      this.log(`\nSoC: ${soc.name}`);
      this.log(`Description: ${soc.description || 'N/A'}`);
      this.log(`Family: ${soc.family?.name || 'N/A'}`);

      this.log('\n===== Cores =====');
      this.log(this.formatCoresText(soc.cores));

      this.log('\n===== Boards =====');
      this.log(this.formatBoardsText(soc.boards, soc.packages));

      this.log('\n===== Packages =====');
      this.log(this.formatPackagesText(soc.packages));

      this.log('\n===== Documentation =====');
      this.log(this.formatDocumentationText(soc.documentation));
      return;
    }

    // Selective output
    this.log(`\nSoC: ${soc.name}`);

    if (flags.cores) {
      this.log('\n===== Cores =====');
      this.log(this.formatCoresText(soc.cores));
    }

    if (flags.boards) {
      this.log('\n===== Boards =====');
      this.log(this.formatBoardsText(soc.boards, soc.packages));
    }

    if (flags.packages) {
      this.log('\n===== Packages =====');
      this.log(this.formatPackagesText(soc.packages));
    }

    if (flags.docs) {
      this.log('\n===== Documentation =====');
      this.log(this.formatDocumentationText(soc.documentation));
    }
  }
}
