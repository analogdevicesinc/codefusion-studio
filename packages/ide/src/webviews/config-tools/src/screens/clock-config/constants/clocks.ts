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
/* UNCONFIGURED_TEXT is the result of trying to get the value of a control that doesn't exist.
 ** This can happen because we try to get the value of a control that is for a different project type,
 ** for example. We record UNCONFIGURED_TEXT so that we can test controls that don't exist without
 ** causing an error, which can be useful to express conditions that work regardless of the project type.
 */
export const UNCONFIGURED_TEXT = 'UNCONFIGURED';

/* NOT_COMPUTED_MARKER is used to indicate that, during the iterative frequency calculation, an
 ** operand to the value has not been computed yet. This means we'll come back to compute the
 ** value later. After the iteration has completed, there will be no NOT_COMPUTED values.
 */
export const NOT_COMPUTED_MARKER = 'pending';

/* UNDEFINED_MARKER is used to specify that a computed value is unknown. This can be because
 ** the user has not entered a required contributing value (e.g. an input pin frequency or divider value)
 ** or because a pin mux is set so that an input clock is unconnected.
 */
export const UNDEFINED_MARKER = 'Undef';

/* EMPTY_CLOCK_VALUE is used as a client side placeholder for unconfigured or uncomputed clock values. */
export const EMPTY_CLOCK_VALUE = '-';
