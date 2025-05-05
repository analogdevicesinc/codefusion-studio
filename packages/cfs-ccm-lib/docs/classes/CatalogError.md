[**cfs-ccm-lib**](../README.md)

***

[cfs-ccm-lib](../README.md) / CatalogError

# Class: CatalogError

Defined in: [src/sdk/soc/types.ts:64](#)

Copyright (c) 2024-2025 Analog Devices, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## Extends

- [`CfsCcmError`](../-internal-/classes/CfsCcmError.md)\<[`CatalogErrorType`](../-internal-/type-aliases/CatalogErrorType.md)\>

## Constructors

### Constructor

> **new CatalogError**(`args0`): `CatalogError`

Defined in: [src/error/error.ts:27](#)

Creates a new CfsCcmError.

#### Parameters

##### args0

The error object

###### cause?

`unknown`

The cause of the error (typically an exception to wrap)

###### message

`string`

The error message to display

###### type

[`CatalogErrorType`](../-internal-/type-aliases/CatalogErrorType.md)

The error type (used for categorization)

#### Returns

`CatalogError`

#### Inherited from

[`CfsCcmError`](../-internal-/classes/CfsCcmError.md).[`constructor`](../-internal-/classes/CfsCcmError.md#constructor)

## Properties

### cause?

> `optional` **cause**: `unknown`

Defined in: [src/error/error.ts:18](#)

#### Inherited from

[`CfsCcmError`](../-internal-/classes/CfsCcmError.md).[`cause`](../-internal-/classes/CfsCcmError.md#cause)

***

### type

> **type**: [`CatalogErrorType`](../-internal-/type-aliases/CatalogErrorType.md)

Defined in: [src/error/error.ts:17](#)

#### Inherited from

[`CfsCcmError`](../-internal-/classes/CfsCcmError.md).[`type`](../-internal-/classes/CfsCcmError.md#type)
