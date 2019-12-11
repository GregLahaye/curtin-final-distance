class Lesson {
  constructor(unit, activity, day, start, finish, venue) {
    this.unit = unit;
    this.activity = activity;
    this.day = day;
    this.start = start;
    this.finish = finish;
    this.venue = venue;
  }
}

function lessonIsValid(lesson) {
  let valid = true;

  valid = valid && lesson.venue !== 'NO.VENUE';

  return valid;
}

function parseLessons() {
  const lessons = [];

  $('table.unitList').each((tableIndex, tableElement) => {
    $(tableElement).find('tbody tr').each((rowIndex, rowElement) => {
      const columns = $(rowElement).find('td');

      const unit = columns[1].querySelector('[title]').innerText;
      const activity = columns[3].querySelector('[title]').innerText;
      const day = columns[5].querySelector('[title]').innerText;
      const start = columns[6].querySelector('[title]').innerText;
      const finish = columns[7].querySelector('[title]').innerText;
      const venue = columns[10].querySelector('[title]').innerText;

      const lesson = new Lesson(unit, activity, day, start, finish, venue);

      if (lessonIsValid(lesson)) {
        lessons.push(lesson);
      }
    });
  });

  return lessons;
}


// filter out invalid lessons
// group lessons by unit + activity
// create all possible Schedule objects
// filter out invalid schedules
// calculate wait time of each schedule
// determine schedules with least wait time
// output results to page

parseLessons();
