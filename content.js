class Period {
  constructor(day, start, end) {
    this.day = day;
    this.start = this.parse(start);
    this.end = this.parse(end);
    this.length = this.end - this.start;
  }

  parse(s) {
    const parts = s.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    return (hours * 60) + minutes;
  }

  overlaps(other) {
    return Math.max(this.start, other.start) < Math.min(this.end, other.end);
  }
}

class Lesson {
  constructor(unit, activity, day, start, end, venue) {
    this.unit = unit;
    this.activity = activity;
    this.period = new Period(day, start, end);
    this.venue = venue;
  }
}

class Schedule {
  constructor(lessons, travel) {
    this.lessons = lessons;
    this.calculate();
  }

  calculate() {
    // TODO: calculate score
    this.score = travel;
  }

  conflicts() {
    // TODO: check if lessons conflict
  }
}

function parseDOM() {
  const lessons = [];

  $('table.unitList tbody').each((i, tbodyElement) => {
    $(tbodyElement).find('tr').each((j, trElement) => {
      const tdElements = $(trElement).find('td span[title]');

      const unit = $(trElement).find('td a[title]').text();
      const activity = $(tdElements[1]).text();
      const day = $(tdElements[3]).text();
      const start = $(tdElements[4]).text();
      const end = $(tdElements[5]).text();
      const venue = $(tdElements[8]).text();

      const lesson = new Lesson(unit, activity, day, start, end, venue);
      lessons.push(lesson);
    });
  });

  return lessons;
}

/*
function generateUnits(lessons) {
  const units = {};

  lessons.forEach((lesson) => {
    if (!(lesson.unit in units)) {
      units[lesson.unit] = {};
      units[lesson.unit][lesson.activity] = [];
    } else if (!(lesson.activity in units[lesson.unit])) {
      units[lesson.unit][lesson.activity] = [];
    }

    units[lesson.unit][lesson.activity].push(lesson);
  });

  return units;
}
*/

function lessonFilter(lesson, blocked) {
  let valid = lesson.venue !== 'NO.VENUE'; // filter out online lectures

  // filter out lessons during blocked periods
  let i = 0;
  while (valid && i < blocked.length) {
    valid = !lesson.overlaps(blocked[i]);
    i += 1;
  }

  return valid;
}

function findBestSchedules(lessons) {
  const schedules = [];

  schedules.push(new Schedule(lessons[0])); // this don't make sense

  // create all permuations
  // create Schedule object of each permuation
  // remove schedules that conflicts()
  // calculate score of each schedule

  return schedules;
}

function f() {
  // user defined values
  const blocked = [
    new Period('Monday', '14:00', '18:00'),
    new Period('Friday', '06:00', '18:00'),
    new Period('Thursday', '12:00', '14:00'),
  ];
  const travelTime = 2;

  let lessons = parseDOM();
  lessons = lessons.filter((lesson) => lessonFilter(lesson, blocked));

  const schedules = findBestSchedules(lessons, travelTime);

  console.log(schedules);
}

/*
 * UI Notes:
 * Blocked period inputs
 * Activate buttons
 */

f();
