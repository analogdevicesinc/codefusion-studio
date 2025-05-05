[**cfs-ccm-lib**](../README.md)

***

[cfs-ccm-lib](../README.md) / SocDataStore

# Interface: SocDataStore

Defined in: [src/sdk/soc/types.ts:24](#)

**`Internal`**

Local data store for SoC catalog.
This interface is used to abstract the storage mechanism for the SoC catalog.

## Properties

### close()

> **close**: () => `Promise`\<`void`\>

Defined in: [src/sdk/soc/types.ts:33](#)

#### Returns

`Promise`\<`void`\>

***

### destroy()

> **destroy**: () => `Promise`\<`void`\>

Defined in: [src/sdk/soc/types.ts:34](#)

#### Returns

`Promise`\<`void`\>

***

### get()

> **get**: (`id`) => `Promise`\<`undefined` \| [`StoreItem`](../-internal-/type-aliases/StoreItem.md)\>

Defined in: [src/sdk/soc/types.ts:26](#)

#### Parameters

##### id

`string`

#### Returns

`Promise`\<`undefined` \| [`StoreItem`](../-internal-/type-aliases/StoreItem.md)\>

***

### isEmpty()

> **isEmpty**: () => `Promise`\<`boolean`\>

Defined in: [src/sdk/soc/types.ts:30](#)

#### Returns

`Promise`\<`boolean`\>

***

### list()

> **list**: () => `Promise`\<[`StoreItem`](../-internal-/type-aliases/StoreItem.md)[]\>

Defined in: [src/sdk/soc/types.ts:29](#)

#### Returns

`Promise`\<[`StoreItem`](../-internal-/type-aliases/StoreItem.md)[]\>

***

### purge()

> **purge**: () => `Promise`\<`void`\>

Defined in: [src/sdk/soc/types.ts:31](#)

#### Returns

`Promise`\<`void`\>

***

### replace()

> **replace**: (`incoming`) => `Promise`\<`void`\>

Defined in: [src/sdk/soc/types.ts:32](#)

#### Parameters

##### incoming

`SocDataStore`

#### Returns

`Promise`\<`void`\>

***

### set()

> **set**: (`soc`) => `Promise`\<`void`\>

Defined in: [src/sdk/soc/types.ts:25](#)

#### Parameters

##### soc

[`StoreItem`](../-internal-/type-aliases/StoreItem.md) | [`StoreItem`](../-internal-/type-aliases/StoreItem.md)[]

#### Returns

`Promise`\<`void`\>

***

### validate()

> **validate**: () => `Promise`\<`void`\>

Defined in: [src/sdk/soc/types.ts:35](#)

#### Returns

`Promise`\<`void`\>

## Methods

### getMetadata()

> **getMetadata**(): `Promise`\<`undefined` \| `Record`\<`string`, `unknown`\>\>

Defined in: [src/sdk/soc/types.ts:27](#)

#### Returns

`Promise`\<`undefined` \| `Record`\<`string`, `unknown`\>\>

***

### setMetadata()

> **setMetadata**(`metadata?`): `Promise`\<`void`\>

Defined in: [src/sdk/soc/types.ts:28](#)

#### Parameters

##### metadata?

`Record`\<`string`, `unknown`\>

#### Returns

`Promise`\<`void`\>
