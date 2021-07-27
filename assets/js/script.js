gsap.registerPlugin(ScrollTrigger);

const pageContainer = document.querySelector(".page");

/* SMOOTH SCROLL */
const scroller = new LocomotiveScroll({
  el: pageContainer,
  smooth: true
});

scroller.on("scroll", ScrollTrigger.update);

ScrollTrigger.scrollerProxy(pageContainer, {
  scrollTop(value) {
    return arguments.length
      ? scroller.scrollTo(value, 0, 0)
      : scroller.scroll.instance.scroll.y;
  },
  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      width: window.innerWidth,
      height: window.innerHeight
    };
  },
  pinType: pageContainer.style.transform ? "transform" : "fixed"
});

////////////////////////////////////
////////////////////////////////////
window.addEventListener("load", function () {
  let pinBoxes = document.querySelectorAll(".project-wrap > *");
  let pinWrap = document.querySelector(".project-wrap");
  let pinWrapWidth = pinWrap.offsetWidth;
  let horizontalScrollLength = pinWrapWidth - window.innerWidth;

  // Pinning and horizontal scrolling

  gsap.to(".project-wrap", {
    scrollTrigger: {
      scroller: pageContainer, //locomotive-scroll
      scrub: true,
      trigger: "#projects",
      pin: true,
      // anticipatePin: 1,
      start: "top top",
      end: pinWrapWidth
    },
    x: -horizontalScrollLength,
    ease: "none"
  });

  ScrollTrigger.addEventListener("refresh", () => scroller.update()); //locomotive-scroll

  ScrollTrigger.refresh();
});

////////////////////////////////////////FILTER
filterSelection("web")
function filterSelection(c) {
  var x, i;
  x = document.getElementsByClassName("filterDiv");
  if (c == "web") c = "";
  // Add the "show" class (display:block) to the filtered elements, and remove the "show" class from the elements that are not selected
  for (i = 0; i < x.length; i++) {
    w3RemoveClass(x[i], "show");
    if (x[i].className.indexOf(c) > -1) w3AddClass(x[i], "show");
  }
}

// Show filtered elements
function w3AddClass(element, name) {
  var i, arr1, arr2;
  arr1 = element.className.split(" ");
  arr2 = name.split(" ");
  for (i = 0; i < arr2.length; i++) {
    if (arr1.indexOf(arr2[i]) == -1) {
      element.className += " " + arr2[i];
    }
  }
}

// Hide elements that are not selected
function w3RemoveClass(element, name) {
  var i, arr1, arr2;
  arr1 = element.className.split(" ");
  arr2 = name.split(" ");
  for (i = 0; i < arr2.length; i++) {
    while (arr1.indexOf(arr2[i]) > -1) {
      arr1.splice(arr1.indexOf(arr2[i]), 1);
    }
  }
  element.className = arr1.join(" ");
}

// Add active class to the current control button (highlight it)
var btnContainer = document.getElementById("projectFilter");
var btns = btnContainer.getElementsByClassName("projectFilterBtn");
for (var i = 0; i < btns.length; i++) {
  btns[i].addEventListener("click", function() {
    var current = document.getElementsByClassName("active");
    current[0].className = current[0].className.replace(" active", "");
    this.className += " active";
  });
}

const colors = ["#8ad7a0", "#ef8269", "#b8a3e1", "#f8d778"];
const patterns = ["url(#pattern-stripes)", "url(#pattern-circles)"];
const spots = "url(#pattern-circles)";
const allthethangs = colors.concat(patterns);
const sizes = [4, 6, 2];

const bg = document.querySelector(".bg");

const bgFill = gsap.utils.random(colors);
bg.style.fill = bgFill;

const remainingColors = colors.filter((color) => color !== bgFill);
const complementaryFill = gsap.utils.random(remainingColors);

function circle(x, y) {
	let pathString = `M ${x} ${y} l 1 0 a 1 1 0 0 1 -1 1 Z`;
	const dx = x + 0.5;
	const dy = y + 0.5;

	const ox = x + 0.4;
	const oy = y + 0.4;

	return `<g class="shape" opacity="0"><circle cx="${ox}" cy="${oy}" r="0.4" fill="${complementaryFill}" stroke="${complementaryFill}" stroke-width="0.05"/><circle cx="${dx}" cy="${dy}" r="0.4" fill="${spots}" stroke="black" stroke-width="0.05"/></g>`;
}

function triangle(x, y) {
	const ox = x + 0.1;
	const oy = y + 0.2;

	return `<g class="shape" opacity="0"><path d="M ${x} ${y} l 1 0.5 l -1 0.5 z" stroke-linejoin="round" fill="${complementaryFill}" stroke="${complementaryFill}" stroke-width="0.05"/><path d="M ${ox} ${oy} l 1 0.5 l -1 0.5 z" stroke-linejoin="round" fill="${spots}" stroke="black" stroke-width="0.05"/></g>`;
}

let q = 0;
for (let x = 0; x < 10; x = x + 1.7) {
	for (let y = 0; y < 8; y = y + 1.7) {
		if (q % 2 == 0) {
			document.getElementById("svg").innerHTML += circle(x, y);
		} else {
			document.getElementById("svg").innerHTML += triangle(x, y);
		}
		q++;
	}
}

gsap.set(".shape", {
	transformOrigin: "50% 50%",
	rotate: "random(0, 360, 5)",
	opacity: 1
});