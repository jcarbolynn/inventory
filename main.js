var SpreadSheetID = "1ZfSkVgSC8NrhLRy-F24JHcnvCvLn3YRlocpqI8KQNpI"
var SheetNames = ["Summary"]
// var SheetNames = ["Media/Serum Summary", "NRU Summary", "MN Summary", "pH/Osmo Summary", "Flow Summary", "LNT-02 Summary"]
var EmailSheet = "emails"

var UsageSheet = ["usage"]

function updateUsage(){
  var ss = SpreadsheetApp.openById(SpreadSheetID);
  var inventoryUsage = ss.getSheetByName(UsageSheet);

  usage_array = getUSAGEInventory(inventoryUsage);
  updated_usage = usage_array;
  
  //just do it all in usage_array and then move usage_array to google sheet
  for (var i=0; i<usage_array.length; i++){

    //change new total to total (total will be edited)
    updated_usage[i]['previous'] = usage_array[i]['new'];
    updated_usage[i]['new'] = usage_array[i]['total'];

    //if new total has gone down, difference is ADDED to total used, shift new total to previous total
    if (usage_array[i]['new'] < usage_array[i]['previous']){
      updated_usage[i]['usage'] = usage_array[i]['usage'] + (usage_array[i]['previous'] - usage_array[i]['new']);
    }

    else{
      updated_usage[i]['usage'] = usage_array[i]['usage'] + 0;
    }

    var headings = ['item', 'total','previous', 'new', 'usage'];
    var output = [];

    updated_usage.forEach(item => {
      output.push(headings.map(heading => {
        return item[heading]
      }));
    })

    if (output.length) {
      // Add the headings - delete this next line if headings not required
      output.unshift(headings);
      ss.getSheetByName("Sheet1").getRange(1, 1, output.length, output[0].length).setValues(output);
    }
  }


  var emailInfo = ss.getSheetByName(EmailSheet);
  var email_json = getEmails(emailInfo);

  const now = new Date();
  // month = now.getMonth() +1; <-- it actually will be for the previous month...but DO need to keep this out here so I can adjust for 12/previousyear inventory usage
  month = now.getMonth();
  year = now.getFullYear();
  if (month == 0){
    month = 12;
    year = year -1;
  }

// if first of month send email about usage
  if (now.getDate() == 17){
    // does send as one chunk but UGLY
    for (var j=0; j<email_json.length; j++){
      MailApp.sendEmail({to: email_json[j].email,
                         subject: "Usage Report " + month + "/" + year,
                         htmlBody: printStuff(updated_usage),
                         noReply:true})
    }

    // now time for some code duplication
    for (var i=0; i<usage_array.length; i++){
      updated_usage[i]['usage'] = 0;

      var headings = ['item', 'total','previous', 'new', 'usage'];
      var output = [];

      updated_usage.forEach(item => {
        output.push(headings.map(heading => {
          return item[heading]
        }));
      })

      if (output.length) {
        // Add the headings - delete this next line if headings not required
        output.unshift(headings);
        ss.getSheetByName("Sheet1").getRange(1, 1, output.length, output[0].length).setValues(output);
      }

    }
  }
}

function printStuff(updated_usage){
  string = "";
  for (var i=0; i<usage_array.length; i++){
    temp = JSON.stringify(updated_usage[i]['item']) + ": " + JSON.stringify(updated_usage[i]['usage'])+ ",   ";
    string = string.concat(temp);
  }
  return string;
}

function getUSAGEInventory(item){
  var jo = {};
  var dataArray = [];
  // collecting data from 2nd Row , 1st column to last row and last    // column sheet.getLastRow()-1
  var rows = item.getRange(2,1,item.getLastRow()-1, item.getLastColumn()).getValues();
  for(var i = 0, l= rows.length; i<l ; i++){
    //skip empty values: check if item name (rows[i][0]) is blank, then dont add to dataArray
    if (rows[i][0] !== ''){
      var dataRow = rows[i];
      var record = {};
      record['item'] = dataRow[0];
      record['total'] = dataRow[1];
      record['previous'] = dataRow[2];
      record['new'] = dataRow[3];
      record['usage'] = dataRow[4];
      dataArray.push(record);
    }
  }
  jo = dataArray;
  return jo;
}

function sendMail(){
  var ss = SpreadsheetApp.openById(SpreadSheetID);
  //email stuff
  var emailInfo = ss.getSheetByName(EmailSheet);
  var email_json = getEmails(emailInfo);




  for (var x=0; x<SheetNames.length; x++){
    var sheet = ss.getSheetByName(SheetNames[x]);
    var inventory = getInventory(sheet);
    to_order = toOrder(inventory);

    // this part sends emails on MONDAY (getDay == 1)
    //if (getDay() == 3){
      for (var i=0; i<to_order.length; i++){
        for (var j=0; j<email_json.length; j++){
          item_to_order = to_order[i]['item']
          num_left = to_order[i]['total']
          if (num_left == 1){
            MailApp.sendEmail({to: email_json[j].email, subject: item_to_order, htmlBody: num_left + " bottle of " + item_to_order + " left.", noReply:true})
          }
          else{
            MailApp.sendEmail({to: email_json[j].email, subject: item_to_order, htmlBody: num_left + " bottles of " + item_to_order + " left.", noReply:true})
          }
        }
      }
    //}

    console.log(to_order);

  }
}

// https://blog.devgenius.io/send-mass-emails-using-google-apps-script-from-a-google-spreadsheet-fc2f79c9febd
function getInventory(media){
  var jo = {};
  var dataArray = [];
  // collecting data from 2nd Row , 1st column to last row and last    // column sheet.getLastRow()-1
  var rows = media.getRange(2,1,media.getLastRow()-1, media.getLastColumn()).getValues();
  for(var i = 0, l= rows.length; i<l ; i++){
    //skip empty values: check if item name (rows[i][0]) is blank, then dont add to dataArray
    if (rows[i][0] !== ''){
      var dataRow = rows[i];
      var record = {};
      record['item'] = dataRow[0];
      record['total'] = dataRow[1];
      record['order now'] = dataRow[2];
      dataArray.push(record);
    }
  }
  jo = dataArray;
  return jo;
}

function toOrder(all_inventory){
  var to_order_array = []
  // adds items to order to new array ? not sure what this data structure is
  for (var i=0; i<all_inventory.length; i++){
    //console.log(!isNaN(all_inventory[i]['total']) && !isNaN(all_inventory[i]['order now']));
    // checking that inventory amounts are numbers
    if (!isNaN(all_inventory[i]['total']) && !isNaN(all_inventory[i]['order now'])){
      if (all_inventory[i]['total'] <= all_inventory[i]['order now']){
        to_order_array.push(all_inventory[i]);
        // console.log(typeof(testing_array));
      }
    }
  }
  return to_order_array;
}

function getEmails(email_sheet){
  var jo = {};
  var dataArray = [];
  // collecting data from 2nd Row , 1st column to last row and last    // column sheet.getLastRow()-1
  var rows = email_sheet.getRange(2,1,email_sheet.getLastRow()-1, email_sheet.getLastColumn()).getValues();
  for(var i = 0, l= rows.length; i<l ; i++){
    var dataRow = rows[i];
    var record = {};
    record['email'] = dataRow[0];
    dataArray.push(record);
  }
  jo = dataArray;
  return jo;
}


function updateUsage(){
  var ss = SpreadsheetApp.openById(SpreadSheetID);
  var inventoryUsage = ss.getSheetByName(SheetNames);

  usage_array = getUSAGEInventory(inventoryUsage);
  updated_usage = usage_array;
  
  //just do it all in usage_array and then move usage_array to google sheet
  for (var i=0; i<usage_array.length; i++){

    //change new total to total (total will be edited)
    updated_usage[i]['previous'] = usage_array[i]['new'];
    updated_usage[i]['new'] = usage_array[i]['total'];

    //if new total has gone down, difference is ADDED to total used, shift new total to previous total
    if (usage_array[i]['new'] < usage_array[i]['previous']){
      updated_usage[i]['usage'] = usage_array[i]['usage'] + (usage_array[i]['previous'] - usage_array[i]['new']);
    }

    else{
      updated_usage[i]['usage'] = usage_array[i]['usage'] + 0;
    }

    var headings = ['item', 'total','previous', 'new', 'usage'];
    var output = [];

    updated_usage.forEach(item => {
      output.push(headings.map(heading => {
        return item[heading]
      }));
    })

    if (output.length) {
      // Add the headings - delete this next line if headings not required
      output.unshift(headings);
      // doesnt like getRange here, had issue before too and had to move the triggered function go the top....but now I want to have two functions with different triggers
      ss.getSheetByName("Sheet1").getRange(1, 1, output.length, output[0].length).setValues(output);
    }
  }


  var emailInfo = ss.getSheetByName(EmailSheet);
  var email_json = getEmails(emailInfo);

  const now = new Date();
  // month = now.getMonth() +1; <-- it actually will be for the previous month...but DO need to keep this out here so I can adjust for 12/previousyear inventory usage
  month = now.getMonth();
  year = now.getFullYear();
  if (month == 0){
    month = 12;
    year = year -1;
  }

// if first of month send email about usage
  if (now.getDate() == 1){
    // does send as one chunk but UGLY
    for (var j=0; j<email_json.length; j++){
      MailApp.sendEmail({to: email_json[j].email,
                         subject: "Usage Report " + month + "/" + year,
                         htmlBody: printStuff(updated_usage),
                         noReply:true})
    }

    // now time for some code duplication
    for (var i=0; i<usage_array.length; i++){
      updated_usage[i]['usage'] = 0;

      var headings = ['item', 'total','previous', 'new', 'usage'];
      var output = [];

      updated_usage.forEach(item => {
        output.push(headings.map(heading => {
          return item[heading]
        }));
      })

      if (output.length) {
        // Add the headings - delete this next line if headings not required
        output.unshift(headings);
        ss.getSheetByName("Sheet1").getRange(1, 1, output.length, output[0].length).setValues(output);
      }

    }
  }
}

function printStuff(updated_usage){
  string = "";
  for (var i=0; i<usage_array.length; i++){
    temp = JSON.stringify(updated_usage[i]['item']) + ": " + JSON.stringify(updated_usage[i]['usage'])+ ",   ";
    string = string.concat(temp);
  }
  return string;
}

function getUSAGEInventory(item){
  var jo = {};
  var dataArray = [];
  // collecting data from 2nd Row , 1st column to last row and last    // column sheet.getLastRow()-1
  var rows = item.getRange(2,1,item.getLastRow()-1, item.getLastColumn()).getValues();
  for(var i = 0, l= rows.length; i<l ; i++){
    //skip empty values: check if item name (rows[i][0]) is blank, then dont add to dataArray
    if (rows[i][0] !== ''){
      var dataRow = rows[i];
      var record = {};
      record['item'] = dataRow[0];
      record['total'] = dataRow[1];
      record['previous'] = dataRow[2];
      record['new'] = dataRow[3];
      record['usage'] = dataRow[4];
      dataArray.push(record);
    }
  }
  jo = dataArray;
  return jo;
}

  