import { isWideWidth, WIDE_MIN_WIDTH } from '../layout';

test('phones and the Duo cover screen are compact; the Duo inner screen and iPads are wide', () => {
  expect(isWideWidth(375)).toBe(false);  // small iPhone, Duo cover screen class
  expect(isWideWidth(440)).toBe(false);  // largest iPhone portrait
  expect(isWideWidth(WIDE_MIN_WIDTH)).toBe(true);
  expect(isWideWidth(744)).toBe(true);   // iPad mini portrait
  expect(isWideWidth(1024)).toBe(true);  // iPad Pro 12.9" portrait
});
