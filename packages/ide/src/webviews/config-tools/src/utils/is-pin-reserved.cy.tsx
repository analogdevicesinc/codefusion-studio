import {isPinReserved} from './is-pin-reserved';

const wlp = await import(
	'../../../../../../cli/src/socs/max32690-wlp.json'
);

function TestComponent({pinId}: {readonly pinId: string}) {
	const isReserved = isPinReserved(pinId);
	let resultText;

	if (isReserved) {
		resultText = 'RESERVED PIN';
	} else {
		resultText = 'NON-RESERVED PIN';
	}

	return <div data-test='result'>{resultText}</div>;
}

describe('Is Pin Reserved utility fn', () => {
	before(() => {
		window.localStorage.setItem(
			'Package',
			JSON.stringify(wlp.Packages[0])
		);
	});

	it('Should evaluate signal with PinMuxConfig as non-reserved', () => {
		cy.mount(<TestComponent pinId='E8' />);

		cy.dataTest('result').should('have.text', 'NON-RESERVED PIN');
	});

	it('Should evaluate signal with no PinMuxConfig as reserved', () => {
		cy.mount(<TestComponent pinId='K11' />);

		cy.dataTest('result').should('have.text', 'RESERVED PIN');
	});
});
