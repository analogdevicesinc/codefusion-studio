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
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
	root: path.resolve(__dirname, './src/webviews/elf-explorer'),
	plugins: [react()],
	server: {
		port: 3201
	},
	resolve: {
		alias: {
			'@common': path.resolve(__dirname, './src/webviews/common/')
		}
	},
	build: {
		outDir: path.resolve(__dirname, './out/elf-explorer'),
		emptyOutDir: true,
		target: 'esnext',
		rollupOptions: {
			input: path.resolve(
				__dirname,
				'./src/webviews/elf-explorer/index.html'
			)
		}
	},
	css: {
		preprocessorOptions: {
			loadPaths: [path.resolve(__dirname, './common/styles')]
		}
	}
});
