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

import {type SVGProps} from 'react';
import FirewallConfigIcon from './firewall-config-icon.js';

export default function FirewallConfigIconSmall(
	props: SVGProps<SVGSVGElement>
) {
	return <FirewallConfigIcon width={16} height={16} {...props} />;
}
