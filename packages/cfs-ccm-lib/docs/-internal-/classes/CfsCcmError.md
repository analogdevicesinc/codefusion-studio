[**cfs-ccm-lib**](../../README.md)

***

[cfs-ccm-lib](../../README.md) / [\<internal\>](../README.md) / CfsCcmError

# Class: `abstract` CfsCcmError\<T\>

Defined in: [src/error/error.ts:16](#)

Copyright (c) 2024-2025 Analog Devices, Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## Extends

- `Error`

## Extended by

- [`CatalogError`](../../classes/CatalogError.md)
- [`DataStoreError`](../../classes/DataStoreError.md)

## Type Parameters

### T

`T` *extends* `string`

## Constructors

### Constructor

> **new CfsCcmError**\<`T`\>(`args0`): `CfsCcmError`\<`T`\>

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

`T`

The error type (used for categorization)

#### Returns

`CfsCcmError`\<`T`\>

#### Overrides

`Error.constructor`

## Properties

### cause?

> `optional` **cause**: `unknown`

Defined in: [src/error/error.ts:18](#)

#### Overrides

`Error.cause`

***

### type

> **type**: `T`

Defined in: [src/error/error.ts:17](#)
