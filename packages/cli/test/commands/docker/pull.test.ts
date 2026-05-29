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

import {expect, test} from '@oclif/test';
import {extractRegistryAndRepoName} from 'cfs-lib';

/**
 * Feature: Docker Pull Command
 *
 * Tests cover:
 * - extractRegistryAndRepoName: pure function, unit tested directly
 * - Command flag/argument validation via @oclif/test
 *
 * Note: Tests that actually pull images require a running Docker/Podman
 * instance and network access to a registry, and are therefore out of scope
 * for this unit test suite.
 */

describe('extractRegistryAndRepoName', () => {
  describe('ADI Cloudsmith images', () => {
    it('strips https:// before parsing', () => {
      const result = extractRegistryAndRepoName(
        'https://docker.cloudsmith.io/adi/codefusion-internal/image:1.0'
      );
      expect(result.registry).to.equal('docker.cloudsmith.io');
      expect(result.repo).to.equal(
        'docker.cloudsmith.io/adi/codefusion-internal/image'
      );
    });

    it('strips http:// before parsing', () => {
      const result = extractRegistryAndRepoName(
        'http://docker.cloudsmith.io/adi/codefusion-internal/image:1.0'
      );
      expect(result.registry).to.equal('docker.cloudsmith.io');
      expect(result.repo).to.equal(
        'docker.cloudsmith.io/adi/codefusion-internal/image'
      );
    });

    it('strips digest (@sha256:...) before parsing', () => {
      const result = extractRegistryAndRepoName(
        'docker.cloudsmith.io/adi/codefusion-internal/image@sha256:abc123def456'
      );
      expect(result.registry).to.equal('docker.cloudsmith.io');
      expect(result.repo).to.equal(
        'docker.cloudsmith.io/adi/codefusion-internal/image'
      );
    });
  });

  describe('non-ADI registries', () => {
    it('returns registry and full repo for non-ADI images', () => {
      const result = extractRegistryAndRepoName(
        'myregistry.example.com/myorg/myimage:1.0'
      );
      expect(result.registry).to.equal('myregistry.example.com');
      expect(result.repo).to.equal(
        'myregistry.example.com/myorg/myimage'
      );
    });

    it('strips tag from non-ADI image', () => {
      const result = extractRegistryAndRepoName(
        'ghcr.io/org/repo/image:v2.3.1'
      );
      expect(result.registry).to.equal('ghcr.io');
      expect(result.repo).to.equal('ghcr.io/org/repo/image');
    });

    it('handles image with no tag', () => {
      const result = extractRegistryAndRepoName(
        'myregistry.example.com/myimage'
      );
      expect(result.registry).to.equal('myregistry.example.com');
      expect(result.repo).to.equal('myregistry.example.com/myimage');
    });

    it('does not treat port number as a tag separator', () => {
      // The colon in "registry:5000" comes before the last slash, so it is not a tag
      const result = extractRegistryAndRepoName(
        'myregistry.example.com:5000/myimage:latest'
      );
      expect(result.registry).to.equal('myregistry.example.com:5000');
      expect(result.repo).to.equal(
        'myregistry.example.com:5000/myimage'
      );
    });
  });

  describe('edge cases', () => {
    it('trims leading and trailing whitespace', () => {
      const result = extractRegistryAndRepoName(
        '  docker.cloudsmith.io/adi/repo/image:tag  '
      );
      expect(result.registry).to.equal('docker.cloudsmith.io');
    });
  });
});

describe('docker:pull command', () => {
  describe('argument validation', () => {
    test
      .stderr()
      .command(['docker:pull'], {root: '..'})
      .catch(/Missing 1 required arg/)
      .it('errors when the image argument is missing');
  });

  describe('help', () => {
    test
      .stdout()
      .command(['help', 'docker:pull'], {root: '..'})
      .it('displays the command description and flags', (ctx) => {
        expect(ctx.stdout).to.contain('Pull a Docker image');
        expect(ctx.stdout).to.contain('--update');
        expect(ctx.stdout).to.contain('--nocredential');
        expect(ctx.stdout).to.contain('--quiet');
      });
  });
});
