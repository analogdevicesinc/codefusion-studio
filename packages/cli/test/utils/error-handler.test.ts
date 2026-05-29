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

import {expect} from 'chai';
import {MissingDependencyError} from 'cfs-lib';
import {handleMissingDependencyError} from '../../src/utils/error-handler.js';

/**
 * Feature: Error Handler for Missing Packages
 *   As a CLI developer
 *   I want to handle missing package errors uniformly
 *   So that users see consistent, helpful error messages
 *
 * Background:
 *   Given a handleMissingDependencyError utility function
 */
describe('handleMissingDependencyError', () => {
  describe('non-MissingDependencyError', () => {
    /**
     * Scenario: Generic Error object is passed
     *   Given an Error that is not a MissingDependencyError
     *   When handleMissingDependencyError is called
     *   Then it should return without throwing
     */
    it('should return silently for generic Error', () => {
      const error = new Error('Some other error');
      expect(() => handleMissingDependencyError(error)).to.not.throw();
    });

    /**
     * Scenario: Unknown error type is passed
     *   Given an unknown error type
     *   When handleMissingDependencyError is called
     *   Then it should return without throwing
     */
    it('should return silently for unknown error type', () => {
      expect(() => handleMissingDependencyError(null)).to.not.throw();
      expect(() =>
        handleMissingDependencyError(undefined)
      ).to.not.throw();
      expect(() =>
        handleMissingDependencyError('string error')
      ).to.not.throw();
      expect(() => handleMissingDependencyError(42)).to.not.throw();
    });
  });

  describe('data-model package errors', () => {
    /**
     * Scenario: Data model package is missing
     *   Given a MissingDependencyError for a data model
     *   When handleMissingDependencyError is called
     *   Then it should throw with formatted message
     */
    it('should throw formatted error for missing data model', () => {
      const error = new MissingDependencyError('data-model', {
        soc: 'MAX32690',
        packageId: 'WLP',
        requestedVersion: '1.2.0'
      });

      expect(() => handleMissingDependencyError(error))
        .to.throw()
        .with.property('message')
        .that.includes('Required package')
        .and.includes('MAX32690/WLP')
        .and.includes('version 1.2.0')
        .and.includes('cfsutil pkg install');
    });

    /**
     * Scenario: Data model error with minimal details
     *   Given a MissingDependencyError with soc and packageId but no version
     *   When handleMissingDependencyError is called
     *   Then it should include soc/package in message without version
     */
    it('should handle data model error without version', () => {
      const error = new MissingDependencyError('data-model', {
        soc: 'TestChip100',
        packageId: 'DEFAULT'
      });

      expect(() => handleMissingDependencyError(error))
        .to.throw()
        .with.property('message')
        .that.includes('TestChip100/DEFAULT')
        .and.does.not.include('version');
    });

    /**
     * Scenario: Data model error with no details
     *   Given a MissingDependencyError with empty details
     *   When handleMissingDependencyError is called
     *   Then it should still include installation instructions
     */
    it('should handle data model error with no details', () => {
      const error = new MissingDependencyError('data-model', {});

      expect(() => handleMissingDependencyError(error))
        .to.throw()
        .with.property('message')
        .that.includes('data model')
        .and.includes('cfsutil pkg install');
    });
  });

  describe('plugin package errors', () => {
    /**
     * Scenario: Single plugin is missing
     *   Given a MissingDependencyError for a plugin
     *   When handleMissingDependencyError is called
     *   Then it should throw with formatted message listing the plugin
     */
    it('should throw formatted error for missing plugin', () => {
      const error = new MissingDependencyError('plugin', {
        plugins: [
          {
            id: 'com.analog.zephyr.plugin',
            version: '1.0.0'
          }
        ]
      });

      expect(() => handleMissingDependencyError(error))
        .to.throw()
        .with.property('message')
        .that.includes('Missing plugins')
        .and.includes('com.analog.zephyr.plugin')
        .and.includes('version 1.0.0');
    });

    /**
     * Scenario: Multiple plugins are missing
     *   Given a MissingDependencyError with multiple plugins
     *   When handleMissingDependencyError is called
     *   Then it should list all missing plugins
     */
    it('should list multiple missing plugins', () => {
      const error = new MissingDependencyError('plugin', {
        plugins: [
          {
            id: 'com.analog.plugin1',
            version: '1.0.0'
          },
          {
            id: 'com.analog.plugin2',
            version: '2.0.0'
          }
        ]
      });

      const message = (() => {
        try {
          handleMissingDependencyError(error);
        } catch (e) {
          return (e as Error).message;
        }
      })();

      expect(message)
        .to.include('com.analog.plugin1')
        .and.include('com.analog.plugin2');
    });

    /**
     * Scenario: Plugin has available versions
     *   Given a MissingDependencyError with available versions
     *   When handleMissingDependencyError is called
     *   Then it should list the available versions
     */
    it('should include available versions in plugin error', () => {
      const error = new MissingDependencyError('plugin', {
        plugins: [
          {
            id: 'com.analog.plugin',
            version: '1.0.0',
            availableVersions: ['1.1.0', '1.2.0', '2.0.0']
          }
        ]
      });

      const message = (() => {
        try {
          handleMissingDependencyError(error);
        } catch (e) {
          return (e as Error).message;
        }
      })();

      expect(message)
        .to.include('Available versions')
        .and.include('1.1.0')
        .and.include('1.2.0')
        .and.include('2.0.0');
    });

    /**
     * Scenario: Plugin without version specified
     *   Given a MissingDependencyError with plugin details but no version
     *   When handleMissingDependencyError is called
     *   Then it should list plugin without version info
     */
    it('should handle plugin without version', () => {
      const error = new MissingDependencyError('plugin', {
        plugins: [
          {
            id: 'com.analog.plugin'
          }
        ]
      });

      const message = (() => {
        try {
          handleMissingDependencyError(error);
        } catch (e) {
          return (e as Error).message;
        }
      })();

      expect(message).to.include('com.analog.plugin');
    });

    /**
     * Scenario: Plugin error with empty plugin list
     *   Given a MissingDependencyError with empty plugins array
     *   When handleMissingDependencyError is called
     *   Then it should still include installation instructions
     */
    it('should handle plugin error with empty plugin list', () => {
      const error = new MissingDependencyError('plugin', {
        plugins: []
      });

      expect(() => handleMissingDependencyError(error))
        .to.throw()
        .with.property('message')
        .that.includes('cfsutil pkg install');
    });
  });

  describe('custom package types', () => {
    /**
     * Scenario: Custom package type error
     *   Given a MissingDependencyError with a custom packageType
     *   When handleMissingDependencyError is called
     *   Then it should use the packageType name directly
     */
    it('should handle custom package types', () => {
      const error = new MissingDependencyError('toolchain', {});

      expect(() => handleMissingDependencyError(error))
        .to.throw()
        .with.property('message')
        .that.includes('toolchain');
    });
  });

  describe('error message structure', () => {
    /**
     * Scenario: Error message includes original error message
     *   Given a MissingDependencyError with a custom message
     *   When handleMissingDependencyError is called
     *   Then the error message should include the original message
     */
    it('should preserve original error message', () => {
      const originalMessage = 'Custom error message';
      const error = new MissingDependencyError(
        'data-model',
        {},
        originalMessage
      );

      expect(() => handleMissingDependencyError(error))
        .to.throw()
        .with.property('message')
        .that.includes(originalMessage);
    });

    /**
     * Scenario: Error message includes installation instructions
     *   Given a MissingDependencyError
     *   When handleMissingDependencyError is called
     *   Then the error message should include installation instructions
     */
    it('should include installation instructions', () => {
      const error = new MissingDependencyError('data-model', {});

      expect(() => handleMissingDependencyError(error))
        .to.throw()
        .with.property('message')
        .that.includes('cfsutil pkg search')
        .and.includes('cfsutil pkg install');
    });
  });
});
