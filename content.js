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

    this.distance = 0;

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

    this.distance = this.travel * 2 * Object.keys(days).length;

    Object.keys(days).forEach((day) => {
      this.distance += days[day].end - days[day].start - days[day].length;
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

function lessonFilter(lesson, blockedPeriods) {
  // TODO: clean this up

  let valid = lesson.venue !== 'NO.VENUE'; // filter out online lectures

  // filter out lessons during blocked periods
  let i = 0;
  while (valid && i < blockedPeriods.length) {
    valid = !lesson.period.overlaps(blockedPeriods[i]);
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
  $('.instructions').remove();
  $('.domTT').remove();
}

function createTravelTimeElement() {
  // create travel time div
  $('<div>')
    .attr('id', 'travelTimeContainer')
    .insertAfter('#timetable_gridbyunit_legend');

  // create travel time label
  $('#travelTimeContainer').append(
    $('<label>')
      .attr('for', 'travelTime')
      .text('Travel Time: ')
  );

  // create travel time input
  $('#travelTimeContainer').append($('<input>').attr('id', 'travelTime'));

  // create travel time button
  $('#travelTimeContainer').append(
    $('<button>')
      .attr('id', 'updateTravelTime')
      .attr('type', 'button')
      .text('Update Travel Time')
  );
}

function createBlockedPeriodsElement() {
  // create blocked periods container
  $('<div>')
    .attr('id', 'blockedPeriodsContainer')
    .insertAfter('#timetable_gridbyunit_legend');

  // create blocked period day label
  $('#blockedPeriodsContainer').append($('<label for="day">Day: </label>'));

  // create blocked period day input
  $('#blockedPeriodsContainer').append($('<input id="blockedPeriodDay">'));

  // create blocked period start label
  $('#blockedPeriodsContainer').append($('<label for="start">Start: </label>'));

  // create blocked period start input
  $('#blockedPeriodsContainer').append($('<input id="blockedPeriodStart">'));

  // create blocked period end label
  $('#blocked').append($('<label for="end">End: </label>'));

  // create blocked period end input
  $('#blockedPeriodsContainer').append($('<input id="blockedPeriodEnd">'));

  // create blocked periods update button
  $('#blockedPeriodsContainer').append(
    $('<button id="addBlockedPeriod" type="button">Add</button>')
  );

  // create blocked periods list
  $('#blockedPeriodsContainer').append($('<ul id="blockedPeriodsList"></ul>'));
}

function createSchedulesElement() {
  $('<ul id="schedules">').insertAfter('#blockedPeriodsContainer');
  $('#schedules').css('list-style-type', 'none');
  $('#schedules').css('margin', '0');
  $('#schedules').css('padding', '10px');
  $('#schedules').css('overflow', 'hidden');
  $('#schedules').css('width', '100%');
  $('#schedules').css('text-align', 'center');
  $('#schedules').css('background-color', '#eeeeee');
}

function calculateSchedules(blockedPeriods, travelTime) {
  let lessons = scrapeDocument();

  lessons = lessons.filter((lesson) => lessonFilter(lesson, blockedPeriods));

  const schedules = findBestSchedules(lessons, travelTime);

  const best = schedules.sort((a, b) => a.distance - b.distance).slice(0, 10);

  return best;
}

function updateTimetable(schedule) {
  $('table.unitList input[type="checkbox"]').each((i, checkbox) => {
    $(checkbox).prop('checked', false);
  });

  // check lessons from schedule
  // TODO: clean this up
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

  // click 'Update Timetable' button
  $('input.formSubmit').click();

  // scroll to top of schedules
  $(document).scrollTop($('#schedules').offset().top);
}

function updateSchedulesList(schedules) {
  // remove current schedules
  $('#schedules li').remove();

  // add each schedule to list
  schedules.forEach((schedule, index) => {
    $('#schedules').append(
      $(`<li id="${index}">Schedule #${index} (${schedule.distance})</li>`)
    );
  });

  // update schedule styling
  $('#scheudles li')
    .css('float', 'left')
    .css('list-style-type', 'none')
    .css('width', '20%')
    .css('margin', '0')
    .css('text-align', 'center')
    .css('background-color', 'skyblue')
    .css('padding', '10px 0');

  // select best schedule
  $('#schedules li#0').click();
}

function f() {
  let schedules = [];
  let travelTime = 60;
  const blockedPeriods = [];

  // remove unecessary elements from page
  cleanPage();

  // create blocked periods element
  createBlockedPeriodsElement();

  // create travel time element
  createTravelTimeElement();

  createSchedulesElement();

  // create travel time update listener
  $('#updateTravelTime').on('click', () => {
    travelTime = +$('#travelTime').val();
    schedules = calculateSchedules(blockedPeriods, travelTime);
    updateSchedulesList(schedules);
  });

  // create add blocked period listener
  $('#addBlockedPeriod').on('click', () => {
    const day = $('#blockedPeriodDay').val();
    const start = $('#blockedPeriodStart').val();
    const end = $('#blockedPeriodEnd').val();

    const period = new Period(day, start, end);
    blockedPeriods.push(period);

    schedules = calculateSchedules(blockedPeriods, travelTime);
    updateSchedulesList(schedules);

    $('#blockedPeriodsList').append(
      $(
        `<li data-day="${day}" data-start="${start}" data-end="${end}">${day}, ${start} to ${end}</li>`
      )
    );
  });

  // create blocked period remove listener
  $('#blockedPeriodsList').on('click', 'li', (e) => {
    const day = $(e.target).attr('data-day');
    const start = $(e.target).attr('data-start');
    const end = $(e.target).attr('data-end');

    const period = new Period(day, start, end);

    blockedPeriods.forEach((current) => {
      if (period.equals(current)) {
        blockedPeriods.splice(blockedPeriods.indexOf(current), 1);
      }
    });

    $(e.target).remove();

    schedules = calculateSchedules(blockedPeriods, travelTime);
    updateSchedulesList(schedules);
  });

  // add schedule listener
  $('#schedules').on('click', 'li', (e) => {
    cleanPage();
    updateTimetable(schedules[e.target.id]);
  });

  // update travel time input value
  $('#travelTime').val(travelTime);

  schedules = calculateSchedules(blockedPeriods, travelTime);

  updateSchedulesList(schedules);
}

f();
