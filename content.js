class Period {
  constructor(day, start, end) {
    this.day = day;
    this.start = Period.parse(start);
    this.end = Period.parse(end);
    this.length = this.end - this.start;
  }

  static parse(s) {
    const a = s.split(':');
    return +a[0] * 60 + +a[1];
  }

  overlaps(other) {
    return (
      this.day === other.day &&
      Math.max(this.start, other.start) < Math.min(this.end, other.end)
    );
  }

  equals(other) {
    return (
      this.day === other.day &&
      this.start === other.start &&
      this.end === other.end
    );
  }
}

class Lesson {
  constructor(unit, activity, period, venue) {
    this.unit = unit;
    this.activity = activity;
    this.period = period;
    this.venue = venue;
  }

  same(other) {
    return this.unit === other.unit && this.activity === other.activity;
  }

  equals(other) {
    return (
      this.same(other) &&
      this.period.equals(other.period) &&
      this.venue === other.venue
    );
  }
}

class Schedule {
  constructor(lessons, travel) {
    this.lessons = lessons;
    this.travel = travel;
    this.calculate();
  }

  calculate() {
    // TODO: can be made more concise

    this.score = 0;

    const days = {};

    this.lessons.forEach((lesson) => {
      if (!(lesson.period.day in days)) {
        days[lesson.period.day] = {
          length: 0,
          start: 24,
          end: 0,
        };
      }

      days[lesson.period.day].length += lesson.period.length;

      if (lesson.period.start < days[lesson.period.day].start) {
        days[lesson.period.day].start = lesson.period.start;
      }

      if (lesson.period.end > days[lesson.period.day].end) {
        days[lesson.period.day].end = lesson.period.end;
      }
    });

    this.score = this.travel * 2 * Object.keys(days).length;

    Object.keys(days).forEach((day) => {
      this.score += days[day].end - days[day].start - days[day].length;
    });
  }

  conflicts() {
    // TODO: can be made more concise
    let conflict = false;

    const periods = [];
    for (let i = 0; i < this.lessons.length - 1; i += 1) {
      for (let j = i + 1; j < this.lessons.length; j += 1) {
        periods.push([this.lessons[i].period, this.lessons[j].period]);
      }
    }

    let i = 0;
    while (!conflict && i < periods.length) {
      conflict = periods[i][0].overlaps(periods[i][1]);
      i += 1;
    }

    return conflict;
  }
}

function scrapeDocument() {
  const lessons = [];

  $('table.unitList tbody tr').each((i, trElement) => {
    const tdElements = $(trElement).find('td span[title]');

    const unit = $(trElement)
      .find('td a[title]')
      .text();
    const activity = $(tdElements[1]).text();
    const day = $(tdElements[3]).text();
    const start = $(tdElements[4]).text();
    const end = $(tdElements[5]).text();
    const venue = $(tdElements[8]).text();

    const period = new Period(day, start, end);
    const lesson = new Lesson(unit, activity, period, venue);
    lessons.push(lesson);
  });

  return lessons;
}

function lessonFilter(lesson, blocked) {
  // TODO: clean  this up

  let valid = lesson.venue !== 'NO.VENUE'; // filter out online lectures

  // filter out lessons during blocked periods
  let i = 0;
  while (valid && i < blocked.length) {
    valid = !lesson.period.overlaps(blocked[i]);
    i += 1;
  }

  return valid;
}

function findBestSchedules(lessons, travelTime) {
  // TODO: rename function, separate and decouple
  const groups = [];

  lessons.forEach((lesson) => {
    let found = false;
    let i = 0;
    while (!found && i < groups.length) {
      found = groups[i][0].same(lesson);
      i += 1;
    }

    if (found) {
      groups[i - 1].push(lesson);
    } else {
      groups.push([lesson]);
    }
  });

  // create all permuations
  // https://stackoverflow.com/questions/12303989/cartesian-product-of-multiple-arrays-in-javascript/50631472#50631472
  const permutations = groups.reduce((acc, curr) =>
    acc.flatMap((c) => curr.map((n) => [].concat(c, n)))
  );

  const schedules = [];
  permutations.forEach((permutation) => {
    const schedule = new Schedule(permutation, travelTime);
    if (!schedule.conflicts()) {
      schedules.push(schedule);
    }
  });

  return schedules;
}

function cleanPage() {
  // TODO: remove all uneccessary elements from page
  $('.instructions').hide();
}

function f() {
  // TODO: add option to not allow full classes
  // TODO: add option to not allow certain classes

  // user defined values
  const blocked = [
    new Period('Monday', '16:00', '20:00'),
    new Period('Thursday', '11:00', '13:00'),
  ];

  const travelTime = 120;

  let lessons = scrapeDocument();
  // TODO: move to separate function
  lessons = lessons.filter((lesson) => lessonFilter(lesson, blocked));

  const schedules = findBestSchedules(lessons, travelTime);

  // TODO: move to separate function
  const best = schedules.sort((a, b) => a.score - b.score).slice(0, 10);

  cleanPage();

  // TODO: create list of top ten best options, more than ten if equal
  $('<ul>')
    .attr('id', 'best')
    .css('list-style-type', 'none')
    .css('margin', '0')
    .css('padding', '0')
    .css('overflow', 'hidden')
    .css('width', '100%')
    .css('text-align', 'center')
    .css('background-color', '#eeeeee')
    .insertAfter('#timetable_gridbyunit_legend');

  best.forEach((schedule, index) => {
    $('ul#best').append(
      $('<li>')
        .attr('id', index)
        .text(index)
        .css('float', 'left')
        .css('list-style-type', 'none')
        .css('width', '20%')
        .css('margin', '0')
        .css('text-align', 'center')
        .css('padding', '10px 0')
    );
  });

  $('ul li:odd').css('background-color', '#ddd');

  $('ul#best > li').on('click', (e) => {
    doStuff(best[e.target.id]);
  });

  // TODO: add event listeners to update timetable when option from list is selected

  // TODO: allow user to input blocked periods

  console.log(best);
}

// TODO: rename and clean
function doStuff(schedule) {
  $('table.unitList input').each((i, input) => {
    $(input).prop('checked', false);
  });

  $('table.unitList tbody tr').each((i, trElement) => {
    const tdElements = $(trElement).find('td span[title]');
    const unit = $(trElement)
      .find('td a[title]')
      .text();
    const activity = $(tdElements[1]).text();
    const day = $(tdElements[3]).text();
    const start = $(tdElements[4]).text();
    const end = $(tdElements[5]).text();
    const venue = $(tdElements[8]).text();
    const period = new Period(day, start, end);
    const lesson = new Lesson(unit, activity, period, venue);

    let j = 0;
    const found = false;
    while (!found && j < schedule.lessons.length) {
      if (schedule.lessons[j].equals(lesson)) {
        $(trElement)
          .find('input')
          .prop('checked', true);
      }

      j += 1;
    }
  });

  $('input.formSubmit').click();

  $(document).scrollTop($('#best').offset().top);

  // TODO: add anchor tag and go there (top of calendar)
}

f();
