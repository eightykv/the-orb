const mouseEvents = require("global-mouse-events");

mouseEvents.on("mouseup", event => {
  console.log(event); // { x: 2962, y: 483, button: 1 }
});
