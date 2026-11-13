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

import {assert, expect} from 'chai';
import {runCommand} from '@oclif/test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {AiCommandError, CfsToolManager, AIToolsPlugin} from 'cfs-lib';
import Sinon from 'sinon';
import type {AiCommandResult, CfsAiProfilingReport} from 'cfs-types';

import {
  assertSuccessEnvelopeData,
  assertValidEnvelope
} from '../../utils/assert-json-envelope.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.resolve(__dirname, '../../fixtures');
const MODELS_DIR = path.resolve(FIXTURES_DIR, 'models');

describe('ai:profile', () => {
  let sandbox: Sinon.SinonSandbox;
  let runProfileStub: Sinon.SinonStub;

  const VALID_OUTPUT: AiCommandResult<CfsAiProfilingReport> = {
    code: 0,
    validCodes: [0],
    events: [
      {
        type: 'INFO',
        message:
          'Memory analysis: 0.1 KB peak usage, 0.0% utilization, status: OK'
      },
      {
        type: 'INFO',
        message:
          'Optimization recommendations available through smart memory analysis and layerwise opportunities'
      }
    ],
    data: {
      type: 'profile',
      model_summary: {
        model_name: 'test-model.tflite',
        model_path: '/models/test-model.tflite',
        framework: 'TensorFlow Lite',
        model_size_kb: 1.25390625,
        target_dtype: 'float32',
        layer_count: 3,
        total_parameters: null
      },
      hardware_metrics: {
        total_cycles: 576,
        estimated_latency_ms: 0.0048000000000000004,
        estimated_power_mw: 0,
        peak_memory_kb: 0.125,
        peak_memory_mb: 0.0001220703125,
        available_ram_kb: 1024,
        accelerated_layers: 0,
        cpu_only_layers: 3
      },
      memory_analysis: {
        model_peak_ram_kb: 0.125,
        available_ram_kb: 1024,
        ram_utilization_percent: 0.01220703125,
        ram_status: 'OK',
        memory_issues: [],
        memory_recommendations: [
          'High memory variance detected (73.8% of average) - consider tensor lifecycle optimization and memory pooling'
        ]
      },
      layer_performance: [
        {
          layer_idx: 0,
          layer_name: 'FULLY_CONNECTED',
          operator_type: null,
          cycles: 32,
          latency_ms: 0.0002666666666666667,
          energy_uj: 0.00272,
          power_mw: 0,
          is_accelerated: false,
          macs: 16,
          memory_kb: 0.125
        },
        {
          layer_idx: 1,
          layer_name: 'FULLY_CONNECTED',
          operator_type: null,
          cycles: 512,
          latency_ms: 0.004266666666666667,
          energy_uj: 0.04352,
          power_mw: 0,
          is_accelerated: false,
          macs: 256,
          memory_kb: 1.0625
        },
        {
          layer_idx: 2,
          layer_name: 'FULLY_CONNECTED',
          operator_type: null,
          cycles: 32,
          latency_ms: 0.0002666666666666667,
          energy_uj: 0.00272,
          power_mw: 0,
          is_accelerated: false,
          macs: 16,
          memory_kb: 0.06640625
        }
      ],
      optimization_suggestions: [],
      optimization_opportunities: {
        total_parameter_memory_kb: 1.25390625,
        total_macs: 288,
        layerwise_opportunities: [
          {
            layer_index: 1,
            op_type: 'FULLY_CONNECTED',
            parameter_memory_kb: 1.0625,
            macs: 256,
            kernel_info: '[[16, 16], [16]]',
            suggestion: 'Quantize weights and consider sparsity'
          },
          {
            layer_index: 0,
            op_type: 'FULLY_CONNECTED',
            parameter_memory_kb: 0.125,
            macs: 16,
            kernel_info: '[[16, 1], [16]]',
            suggestion: 'Quantize weights and consider sparsity'
          },
          {
            layer_index: 2,
            op_type: 'FULLY_CONNECTED',
            parameter_memory_kb: 0.06640625,
            macs: 16,
            kernel_info: '[[1, 16], [1]]',
            suggestion: 'Quantize weights and consider sparsity'
          }
        ],
        macs_opportunities: [
          {
            layer_index: 1,
            op_type: 'FULLY_CONNECTED',
            parameter_memory_kb: 1.0625,
            macs: 256,
            kernel_info: '[[16, 16], [16]]',
            suggestion:
              'Use sparse matrices or reduce hidden dimensions'
          },
          {
            layer_index: 0,
            op_type: 'FULLY_CONNECTED',
            parameter_memory_kb: 0.125,
            macs: 16,
            kernel_info: '[[16, 1], [16]]',
            suggestion:
              'Use sparse matrices or reduce hidden dimensions'
          },
          {
            layer_index: 2,
            op_type: 'FULLY_CONNECTED',
            parameter_memory_kb: 0.06640625,
            macs: 16,
            kernel_info: '[[1, 16], [1]]',
            suggestion:
              'Use sparse matrices or reduce hidden dimensions'
          }
        ]
      },
      errors: [],
      info: {
        timestamp: '2026-08-12T08:13:23',
        version: '2.2.0',
        hardware: {
          FlashSize: 3072,
          RamSize: 1024,
          CoreClock: 120,
          SupportedOps: [],
          AccelOps: [],
          SupportedDataTypes: [],
          OperatorInfos: [
            {
              Name: 'MAC',
              Cycles: 2,
              Energy: 0.17
            }
          ],
          Target: {
            Soc: 'MAX32690',
            Core: 'CM4',
            Package: 'CTBGA',
            Accelerator: null,
            Family: 'Cortex-M'
          }
        }
      }
    }
  };

  const ERROR_OUTPUT: AiCommandResult = {
    code: 1,
    validCodes: [0],
    events: [
      {
        type: 'WARN',
        message:
          'Model contains multiple subgraphs, only the first will be analyzed'
      },
      {
        type: 'ERROR',
        message:
          "Unexpected error during model analysis: Analysis failed during subgraph analysis: 'int' object is not iterable (after 0.00s)"
      },
      {
        type: 'ERROR',
        message:
          "ModelAnalysisErrorUnexpected error during model analysis: Analysis failed during subgraph analysis: 'int' object is not iterable"
      }
    ]
  };

  beforeEach(() => {
    sandbox = Sinon.createSandbox();

    sandbox
      .stub(CfsToolManager.prototype, 'getToolPath')
      .resolves('/mock/cfsai/path');

    sandbox
      .stub(AIToolsPlugin.prototype, 'readBackendJson')
      .resolves({
        properties: {
          tflm: [{Id: 'key', Type: 'string', Default: 'value'}]
        },
        SupportedBackends: {
          tflm: {
            Name: 'tflm',
            Package: 'cfs-lib',
            Module: 'tflm',
            Targets: []
          }
        }
      } as any);

    runProfileStub = sandbox
      .stub(AIToolsPlugin.prototype, 'runProfile')
      .resolves(VALID_OUTPUT);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('Core Inference Logic', () => {
    describe('Single-Core SoC', () => {
      it('should auto-select core when SoC has only one core', async () => {
        const {stderr, error} = await runCommand(
          [
            'ai:profile',
            '--soc',
            'ai_single_core',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        // Command should not error about missing --core
        expect(error).to.not.exist;
        expect(stderr).to.not.include('--core is required');
        expect(stderr).to.not.include('Multiple cores');
      });

      it('should respect explicit --core even with single-core SoC', async () => {
        const {stderr, error} = await runCommand(
          [
            'ai:profile',
            '--soc',
            'ai_single_core',
            '--core',
            'CM4',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        // Command should execute without errors
        expect(error).to.not.exist;
        expect(stderr).to.not.include('--core is required');
      });
    });

    describe('Multi-Core SoC with Single AI Core', () => {
      it('should auto-select AI core and emit warning when multiple cores but single AI', async () => {
        const {stderr, error} = await runCommand(
          [
            'ai:profile',
            '--soc',
            'ai_multi_single',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        // Should auto-select and emit warning
        expect(error).to.not.exist;
        expect(stderr).to.include('Multiple cores found');
        expect(stderr).to.include('Defaulting to');
      });

      it('should respect explicit --core and not emit warning', async () => {
        const {stderr, error} = await runCommand(
          [
            'ai:profile',
            '--soc',
            'ai_multi_single',
            '--core',
            'CM4',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        expect(error).to.not.exist;
        expect(stderr).to.not.include('Defaulting to');
      });
    });

    describe('Multi-Core SoC with Multiple AI Cores', () => {
      it('should throw error when --core is omitted and multiple AI cores exist', async () => {
        const {error} = await runCommand(
          [
            'ai:profile',
            '--soc',
            'ai_multi_multiple',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        expect(error).to.exist;
        expect(error?.message).to.include(
          'Multiple cores with AI support'
        );
      });

      it('should succeed when explicit --core is provided with multiple AI cores', async () => {
        const {error} = await runCommand(
          [
            'ai:profile',
            '--soc',
            'ai_multi_multiple',
            '--core',
            'CM4',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        expect(error).to.not.exist;
      });
    });
  });

  describe('Flag Validation and Normalization', () => {
    describe('Required Flags', () => {
      it('should error when --soc is missing', async () => {
        const {error} = await runCommand(
          [
            'ai:profile',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        expect(error).to.exist;
        expect(error?.message).to.include('--soc');
      });

      it('should error when --model is missing', async () => {
        const {error} = await runCommand(
          ['ai:profile', '--soc', 'ai_single_core'],
          {root: '..'}
        );
        expect(error).to.exist;
        expect(error?.message).to.include('--model');
      });
    });

    describe('Unsupported Flags', () => {
      it('should reject --acc flag with not supported error', async () => {
        const {error} = await runCommand(
          [
            'ai:profile',
            '--soc',
            'ai_single_core',
            '--core',
            'CM4',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite'),
            '--acc',
            'DSP'
          ],
          {root: '..'}
        );
        expect(error).to.exist;
        expect(error?.message).to.include('not currently supported');
      });
    });

    describe('Flag Case Normalization', () => {
      it('should normalize --soc to lowercase', async () => {
        const {stderr, error} = await runCommand(
          [
            'ai:profile',
            '--soc',
            'AI_SINGLE_CORE',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        // Should find the model despite uppercase SoC name
        expect(error).to.not.exist;
        expect(stderr).to.not.include('not found');
      });

      it('should normalize --core to uppercase', async () => {
        const {stderr, error} = await runCommand(
          [
            'ai:profile',
            '--soc',
            'ai_single_core',
            '--core',
            'cm4',
            '--model',
            path.join(MODELS_DIR, 'test-model.tflite')
          ],
          {root: '..'}
        );
        // Should process successfully with lowercase core
        expect(error).to.not.exist;
        expect(stderr).to.not.include('Invalid core');
      });
    });

    describe('Command Return Logic', () => {
      describe('--format text', () => {
        it('GIVEN valid run WHEN runProfile THEN return parsed AiCommandResult', async () => {
          const {stdout, error} = await runCommand(
            [
              'ai:profile',
              '--soc',
              'ai_single_core',
              '--model',
              path.join(MODELS_DIR, 'test-model.tflite')
            ],
            {root: '..'}
          );

          expect(error).to.not.exist;
          VALID_OUTPUT.events.map(({message}) =>
            expect(stdout).to.include(message)
          );
          expect(stdout).to.contain('RESOURCE PROFILING REPORT');
          expect(stdout).to.contain('MODEL SUMMARY');
          expect(stdout).to.contain('MEMORY ANALYSIS');
          expect(stdout).to.contain('HARDWARE PERFORMANCE');
          expect(stdout).to.contain('PER-LAYER PERFORMANCE');
          expect(stdout).to.contain('OPTIMIZATION OPPORTUNITIES');
          expect(stdout).to.contain('Memory Recommendations');
          expect(stdout).to.contain('High memory variance detected');
          expect(stdout).to.contain('Total MACs');
        });

        it('GIVEN invalid run WHEN runProfile THEN return parsed AiCommandError', async () => {
          runProfileStub.rejects(new AiCommandError(ERROR_OUTPUT));

          const {error} = await runCommand(
            [
              'ai:profile',
              '--soc',
              'ai_single_core',
              '--model',
              path.join(MODELS_DIR, 'test-model.tflite')
            ],
            {root: '..'}
          );

          expect(error).to.exist;
          ERROR_OUTPUT.events
            .filter((event) => event.type === 'ERROR')
            .map(({message}) =>
              expect(error?.message).to.include(message)
            );
          expect(error?.oclif?.exit).to.equal(1);
        });
      });

      describe('--format json', () => {
        it('GIVEN valid run WHEN runProfile THEN return envelope with report as data', async () => {
          const {stdout, error} = await runCommand(
            [
              'ai:profile',
              '--soc',
              'ai_single_core',
              '--model',
              path.join(MODELS_DIR, 'test-model.tflite'),
              '--format',
              'json'
            ],
            {root: '..'}
          );

          expect(error).to.not.exist;
          const data =
            assertSuccessEnvelopeData<CfsAiProfilingReport>(
              stdout,
              'ai profile'
            );
          assert.deepEqual(data, VALID_OUTPUT.data);
        });

        it('GIVEN invalid run WHEN runProfile THEN return error envelope', async () => {
          runProfileStub.rejects(new AiCommandError(ERROR_OUTPUT));

          const {stdout} = await runCommand(
            [
              'ai:profile',
              '--soc',
              'ai_single_core',
              '--model',
              path.join(MODELS_DIR, 'test-model.tflite'),
              '--format',
              'json'
            ],
            {root: '..'}
          );

          const parsed = assertValidEnvelope(stdout) as {
            ok: boolean;
            command: string;
            errors: {code: string; message: string}[];
          };
          expect(parsed.ok).to.be.false;
          expect(parsed.command).to.equal('ai profile');
          assert.deepEqual(
            parsed.errors,
            ERROR_OUTPUT.events
              .filter((event) => event.type === 'ERROR')
              .map((event) => ({
                code: 'AI_COMMAND_FAILED',
                message: event.message
              }))
          );
        });
      });
    });
  });
});
