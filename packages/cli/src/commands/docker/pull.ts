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
import {Args, Command, Flags} from '@oclif/core';
import {
  containerImageExists,
  extractRegistryAndRepoName,
  getContainerUtility,
  getCredentials,
  pullImage
} from 'cfs-lib';
import {CfsPackageRemoteCredential} from 'cfs-package-manager';

import {getAuthConfig} from '../../utils/session-manager.js';

export default class Pull extends Command {
  static args = {
    image: Args.string({
      description: 'Docker image to pull',
      name: 'image',
      required: true
    })
  };

  static description = 'Pull a Docker image';

  static flags = {
    update: Flags.boolean({
      summary:
        'Pull the docker image even if it already exists locally',
      required: false,
      default: false,
      char: 'u'
    }),
    nocredential: Flags.boolean({
      summary: 'Do not use credentials when pulling the image',
      required: false,
      default: false,
      char: 'n'
    }),
    quiet: Flags.boolean({
      summary: 'Suppress output from the pull command',
      required: false,
      default: false,
      char: 'q'
    })
  };

  public async run(): Promise<void> {
    const {args, flags} = await this.parse(Pull);
    const {registry, repo} = extractRegistryAndRepoName(args.image);
    let creds: CfsPackageRemoteCredential | undefined;

    // check if docker/podman is available
    const containerUtility = await getContainerUtility();

    if (!containerUtility) {
      this.error(
        `No container utility found. Please install Docker or Podman.`
      );
    }

    // check if the image already exists locally
    const imageExists = await containerImageExists(
      containerUtility,
      args.image
    );

    if (imageExists && flags.update !== true) {
      // error message if the image exists and update flag is not set
      this.log(
        `Image ${args.image} already exists locally. Use --update flag to force pull.`
      );
      return;
    }

    if (!flags.nocredential) {
      const authConfig = getAuthConfig();
      creds = await getCredentials(repo, authConfig, flags.quiet);
      if (!creds && !flags.quiet) {
        this.log(
          `No credentials available for registry '${repo}'. Attempting to pull without credentials.`
        );
      }
    }

    await pullImage({
      image: args.image,
      registry,
      utility: containerUtility,
      creds,
      quiet: flags.quiet
    });
  }
}
