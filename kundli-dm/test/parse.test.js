import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBirthDetails, findDate, findTime, isYes, isNo, wantsKundli, amPmReply } from '../src/dm/parse.js';

const cases = [
  ['Rahul Kumar, 12/03/1995, 6:45 am, Patna',
    { name: 'Rahul Kumar', date: { year: 1995, month: 3, day: 12 }, time: { hour: 6, minute: 45 }, place: 'Patna', dateAmbiguous: true }],
  ['Name: Priya Sharma\nDOB: 4 Feb 1962\nTime: 5:30 PM\nPlace: New Delhi',
    { name: 'Priya Sharma', date: { year: 1962, month: 2, day: 4 }, time: { hour: 17, minute: 30 }, place: 'New Delhi' }],
  ['naam amit, janm tithi 25-12-1990, samay shaam 7:10, jagah Muzaffarpur Bihar',
    { name: 'amit', date: { year: 1990, month: 12, day: 25 }, time: { hour: 19, minute: 10 }, place: 'Muzaffarpur Bihar' }],
  ['नाम: सीमा\nजन्म तिथि: १५/०८/१९८८\nजन्म समय: सुबह ५:२०\nजन्म स्थान: वाराणसी',
    { name: 'सीमा', date: { year: 1988, month: 8, day: 15 }, time: { hour: 5, minute: 20 }, place: 'वाराणसी' }],
  ['meri kundli bana do - Neha 1998-07-21 23:15 Mumbai',
    { name: 'Neha', date: { year: 1998, month: 7, day: 21 }, time: { hour: 23, minute: 15 }, place: 'Mumbai' }],
  ['Vikram, March 5, 2001, 10.30 pm, London UK',
    { name: 'Vikram', date: { year: 2001, month: 3, day: 5 }, time: { hour: 22, minute: 30 }, place: 'London UK' }],
  ['Anjali 31/01/85 raat 2 baje Jaipur',
    { name: 'Anjali', date: { year: 1985, month: 1, day: 31 }, time: { hour: 2, minute: 0 }, place: 'Jaipur' }],
];

for (const [msg, want] of cases) {
  test(`parses: ${msg.replace(/\n/g, ' / ')}`, () => {
    const got = parseBirthDetails(msg);
    for (const [k, v] of Object.entries(want)) assert.deepEqual(got[k], v, `${k} in ${JSON.stringify(got)}`);
  });
}

test('12-hour time without am/pm is flagged, not guessed', () => {
  const t = findTime('born at 6:45');
  assert.deepEqual(t.value, { hour: 6, minute: 45 });
  assert.equal(t.needsAmPm, true);
  assert.equal(findTime('18:45').needsAmPm, false);
});

test('date sanity: impossible dates rejected, US order recovered when unambiguous', () => {
  assert.equal(findDate('31/02/1995'), null);
  assert.deepEqual(findDate('03/25/1995').value, { year: 1995, month: 3, day: 25 });
  assert.equal(findDate('05/05/1995').ambiguous, false); // same either way
});

test('intents', () => {
  assert.ok(isYes('haan sahi hai')); assert.ok(isYes('✅ Haan, sahi hai')); assert.ok(isNo('nahi, badlo'));
  assert.ok(wantsKundli('Meri kundli bana do')); assert.ok(wantsKundli('मेरी कुंडली'));
  assert.equal(amPmReply('PM'), 'pm'); assert.equal(amPmReply('subah'), 'am');
});
