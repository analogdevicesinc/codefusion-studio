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

import App from './app';
import {resetStore, store} from './state/store';
import {
	getPackageListRequest,
	isLoggedInStatusType,
	signInRequest
} from '@constants/messages/package-manager-messages';
import {sendMockMessage} from '../../common/test-utils/messenger-mock';
import {
	entry,
	mockPackageManager,
	release
} from './test-utils/package-manager-mock';
import {mountPackageManager} from './test-utils/mount';

/** Backend state holding `count` packages, all on version 1.0.0. */
const manyPackages = (count: number) => ({
	entries: Array.from({length: count}, (_, i) =>
		entry(`test_pkg_${String(i).padStart(2, '0')}`)
	)
});

describe('Package manager - browsing', () => {
	beforeEach(() => {
		cy.viewport(1920, 1080);
		store.dispatch(resetStore());
	});

	describe('missing access', () => {
		it('warns about required packages the account cannot see', () => {
			mockPackageManager({
				entries: [entry('test_pkg1')],
				missingRequiredPackages: [
					{name: 'private_pkg', versions: ['1.0.0', '2.0.0']}
				]
			});

			mountPackageManager(<App />);

			cy.dataTest('missing-packages-alert')
				.should('be.visible')
				.and('contain.text', 'private_pkg/[1.0.0, 2.0.0]');
		});
	});

	describe('pagination', () => {
		it('pages through the loaded list', () => {
			const pm = mockPackageManager(manyPackages(25));

			mountPackageManager(<App />);

			cy.dataTest('pagination-range').should(
				'contain.text',
				'1-10 of 25'
			);
			cy.dataTest('package-card-test_pkg_00').should('exist');
			cy.dataTest('package-card-test_pkg_10').should('not.exist');

			let listCalls = 0;
			cy.then(() => {
				listCalls = pm.callCount(getPackageListRequest.method);
			});

			cy.dataTest('pagination-next').click();

			cy.dataTest('pagination-range').should(
				'contain.text',
				'11-20 of 25'
			);
			cy.dataTest('package-card-test_pkg_10').should('exist');

			cy.dataTest('pagination-last').click();
			cy.dataTest('pagination-range').should(
				'contain.text',
				'21-25 of 25'
			);
			cy.dataTest('pagination-next').should('have.attr', 'disabled');

			// Paging does not fetch the list again.
			cy.then(() => {
				expect(pm.callCount(getPackageListRequest.method)).to.equal(
					listCalls
				);
			});
		});

		it('returns to the first page when a filter changes', () => {
			mockPackageManager(manyPackages(25));

			mountPackageManager(<App />);

			cy.dataTest('pagination-next').click();
			cy.dataTest('pagination-range').should(
				'contain.text',
				'11-20 of 25'
			);

			cy.dataTest('package-search').type('test_pkg_2');

			cy.dataTest('pagination-range').should(
				'contain.text',
				'1-5 of 5'
			);
		});
	});

	describe('search', () => {
		const searchFor = (query: string) => {
			mockPackageManager({
				entries: [
					entry('test_pkg1'),
					entry('test_pkg2', {
						releases: {
							'1.0.0': release('test_pkg2', '1.0.0', {
								description: 'Sensor drivers'
							})
						}
					}),
					entry('test_pkg3', {
						releases: {
							'1.0.0': release('test_pkg3', '1.0.0', {socs: ['SOC9']})
						}
					})
				]
			});

			mountPackageManager(<App />);

			cy.dataTest('package-search').type(query);
			cy.dataTest('pagination-range').should(
				'contain.text',
				'1-1 of 1'
			);
		};

		it('matches the package name', () => {
			searchFor('test_pkg1');
		});

		it('matches a version description', () => {
			searchFor('sensor');
		});

		it('matches a supported SoC', () => {
			searchFor('soc9');
		});
	});

	describe('authentication', () => {
		it('prompts to sign in when the backend reports a signed-out user', () => {
			const pm = mockPackageManager({
				entries: [entry('test_pkg1')],
				loggedIn: false
			});

			mountPackageManager(<App />);

			cy.dataTest('onboarding').should('be.visible');
			cy.dataTest('onboarding-sign-in').click();

			cy.then(() => {
				expect(pm.callCount(signInRequest.method)).to.equal(1);
			});
		});

		it('dismisses the sign-in prompt once the extension confirms sign-in', () => {
			mockPackageManager({
				entries: [entry('test_pkg1')],
				loggedIn: false
			});

			mountPackageManager(<App />);

			cy.dataTest('onboarding').should('be.visible');
			cy.dataTest('onboarding-sign-in').click();

			// Sign-in completes out of band: the extension runs the browser
			// flow and pushes the new status back, which is what clears the
			// prompt — clicking alone must not.
			cy.dataTest('onboarding').should('be.visible');

			cy.then(() => {
				sendMockMessage(isLoggedInStatusType.method, {
					loggedIn: true,
					authSignature: 'user-a'
				});
			});

			cy.dataTest('onboarding').should('not.exist');
			cy.dataTest('package-card-test_pkg1').should('exist');
		});

		it('pins one sign-in prompt above both tabs and keeps it dismissed across them', () => {
			mockPackageManager({
				entries: [entry('test_pkg1')],
				loggedIn: false
			});

			mountPackageManager(<App />);

			cy.dataTest('onboarding').should('be.visible');
			cy.dataTest('package-manager:view-tabs:remotes').click();
			cy.dataTest('onboarding')
				.should('have.length', 1)
				.and('be.visible');

			// The side panel must fill the tab body below the banner. If it is
			// sized to the viewport instead, it overflows and gets clipped.
			cy.dataTest('remotes:add').click();
			cy.dataTest('remote-sidebar').then($panel => {
				const panel = $panel[0].getBoundingClientRect();
				const body = $panel.parent()[0].getBoundingClientRect();

				expect(panel.top).to.equal(body.top);
				expect(panel.bottom).to.equal(body.bottom);
			});
			cy.dataTest('remote-sidebar:close').click();

			cy.dataTest('onboarding-dismiss').click();
			cy.dataTest('onboarding').should('not.exist');

			cy.dataTest('package-manager:view-tabs:packages').click();
			cy.dataTest('package-card-test_pkg1').should('exist');
			cy.dataTest('onboarding').should('not.exist');
		});

		it('stays out of the way when the user is already signed in', () => {
			mockPackageManager({entries: [entry('test_pkg1')]});

			mountPackageManager(<App />);

			cy.dataTest('package-card-test_pkg1').should('exist');
			cy.dataTest('onboarding').should('not.exist');
		});

		it('reloads the catalog when the signed-in identity changes', () => {
			const pm = mockPackageManager({
				entries: [entry('test_pkg_public')],
				loggedIn: false
			});

			mountPackageManager(<App />);

			cy.dataTest('package-card-test_pkg_public').should('exist');

			// Signing in widens what the catalog returns; the webview must
			// discard the signed-out list rather than merge into it.
			cy.then(() => {
				pm.state.entries = [entry('test_pkg_private')];
				sendMockMessage(isLoggedInStatusType.method, {
					loggedIn: true,
					authSignature: 'user-a'
				});
			});

			cy.dataTest('package-card-test_pkg_private').should('exist');
			cy.dataTest('package-card-test_pkg_public').should('not.exist');
			cy.dataTest('onboarding').should('not.exist');
		});
	});
});
