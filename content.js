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
  $(`<div id="travelTimeContainer" style="padding: 20px 40px; background-color: #eee; border-radius: 5px; margin: 10px">
      <span style="font-size: 18px">How long does it take you to travel to university?</span>
      <div style="padding: 20px">
        <label for="travelTime">Travel Time: </label>
        <input type="number" id="travelTime">

        <button type="button" id="updateTravelTime">Update</button>
      </div>
    </div>`).insertAfter('#timetable_gridbyunit_legend');
}

function createBlockedPeriodsElement() {
  $(`<div id="blockedPeriodsContainer" style="padding: 20px 40px; background-color: #eee; border-radius: 5px; margin: 10px">
      <span style="font-size: 18px">Which times would you like to block?</span>
      <div>
        <label for="blockedPeriodDay">Day: </label>
        <select id="blockedPeriodDay">
          <option value="Monday">Monday</option>
          <option value="Tuesday">Tuesday</option>
          <option value="Wednesday">Wednesday</option>
          <option value="Thursday">Thursday</option>
          <option value="Friday">Friday</option>
          <option value="Saturday">Saturday</option>
          <option value="Sunday">Sunday</option>
        </select>

        <label for="blockedPeriodStart">Start: </label>
        <input type="time" id="blockedPeriodStart">

        <label for="blockedPeriodEnd">End: </label>
        <input type="time" id="blockedPeriodEnd">

        <button type="button" id="addBlockedPeriod">Add</button>

        <ul id="blockedPeriodsList" style="font-size: 14px;">
        </ul>
      </div>
    </div>`).insertAfter('#timetable_gridbyunit_legend');
}

function createSchedulesElement() {
  $(
    `<ul id="schedules" style="">
    </ul>`).insertAfter('#blockedPeriodsContainer');
}

function calculateSchedules(blockedPeriods, travelTime) {
  let lessons = scrapeDocument();

  lessons = lessons.filter((lesson) => lessonFilter(lesson, blockedPeriods));

  const schedules = findBestSchedules(lessons, travelTime);

  const sorted = schedules.sort((a, b) => a.distance - b.distance);

  let i = 10;
  let same = true;
  while (same && i < sorted.length) {
    same = sorted[i].distance === sorted[9].distance;

    i++;
  }

  const chosen = sorted.slice(0, i - 1);

  console.log(chosen);
  console.log(sorted);

  return chosen;
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
      $(`<li id="${index}" style="list-style-type: none; text-align: center; padding: 20px 40px; float: left; border-radius: 3px;">
        <span><strong>Schedule #${index}</strong></span><br>
        <span>Distance: ${schedule.distance}</span>
        </li>`)
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
        `<li data-day="${day}" data-start="${start}" data-end="${end}" style="border-radius: 3px">${day}, ${start} to ${end}</li>`
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
  
  // create blocked period hover listener
  $('#blockedPeriodsList').on('mouseenter', 'li', (e) => {
    $(e.target).css('background-color', '#eb6746');
  });

  // create blocked period un-hover listener
  $('#blockedPeriodsList').on('mouseleave', 'li', (e) => {
    $(e.target).css('background-color', '#eee');
  });

  // add schedule listener
  $('#schedules').on('click', 'li', (e) => {
    cleanPage();

    $('#schedules li').css('background-color', '#eee');

    let li;
    if (e.target.tagName === 'LI') {
      li = $(e.target);
    } else {
      li = $(e.target).parents('li');
    }

    const id = li.attr('id');

    updateTimetable(schedules[id]);

    li.css('background-color', '#2fc6e0');
  });

  // update travel time input value
  $('#travelTime').val(travelTime);

  schedules = calculateSchedules(blockedPeriods, travelTime);

  updateSchedulesList(schedules);
}

f();
