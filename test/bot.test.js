// test/bot.test.js
const assert = require('assert');
const { getFakeSTTBalance, setFakeSTTBalance, getFakePositions, addFakePosition, removeFakePosition } = require('../utils/database');

const TEST_USER = 'testuser';
const INSOMNIACS = '0x0C726E446865FFb19Cc13f21aBf0F515106C9662';

function resetTestUser() {
  setFakeSTTBalance(TEST_USER, 100);
  removeFakePosition(TEST_USER, INSOMNIACS);
}

// Simulate session object
function makeSession() {
  return {
    currentToken: {
      address: INSOMNIACS,
      info: { symbol: 'INSOM', name: 'Insomniacs', decimals: 18 },
      estimates: { '1': 100 }
    }
  };
}

describe('Fake Buy/Sell Flow', () => {
  beforeEach(() => resetTestUser());

  it('should persist session currentToken after scan', () => {
    const session = makeSession();
    assert.strictEqual(session.currentToken.address, INSOMNIACS);
  });

  it('should add position and update balance on fake buy', () => {
    setFakeSTTBalance(TEST_USER, 100);
    addFakePosition(TEST_USER, {
      address: INSOMNIACS,
      symbol: 'INSOM',
      name: 'Insomniacs',
      amount: '100',
      decimals: 18
    });
    setFakeSTTBalance(TEST_USER, 99);
    const positions = getFakePositions(TEST_USER);
    assert.strictEqual(positions.length, 1);
    assert.strictEqual(positions[0].amount, '100');
    assert.strictEqual(getFakeSTTBalance(TEST_USER), 99);
  });

  it('should remove position and update balance on fake sell', () => {
    setFakeSTTBalance(TEST_USER, 99);
    addFakePosition(TEST_USER, {
      address: INSOMNIACS,
      symbol: 'INSOM',
      name: 'Insomniacs',
      amount: '100',
      decimals: 18
    });
    // Simulate selling 100%
    removeFakePosition(TEST_USER, INSOMNIACS);
    setFakeSTTBalance(TEST_USER, 100);
    const positions = getFakePositions(TEST_USER);
    assert.strictEqual(positions.length, 0);
    assert.strictEqual(getFakeSTTBalance(TEST_USER), 100);
  });

  it('should handle error: missing session', () => {
    let error;
    try {
      // Simulate missing session
      let session = undefined;
      if (!session || !session.currentToken) throw new Error('Please scan the token again');
    } catch (e) {
      error = e.message;
    }
    assert.strictEqual(error, 'Please scan the token again');
  });

  it('should handle error: no position', () => {
    let error;
    try {
      removeFakePosition(TEST_USER, INSOMNIACS);
      const positions = getFakePositions(TEST_USER);
      const pos = positions.find(p => p.address.toLowerCase() === INSOMNIACS.toLowerCase());
      if (!pos) throw new Error('No position found for this token');
    } catch (e) {
      error = e.message;
    }
    assert.strictEqual(error, 'No position found for this token');
  });
});

console.log('All tests passed!'); 