console.clear();
console.log("");

const config = {
  src: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/175711/open-peeps-sheet.png",
  rows: 15,
  cols: 7,
};

// 公用
// 随机出现或移除
const randomRange = (min, max) => min + Math.random() * (max - min);

const randomIndex = (array) => randomRange(0, array.length) | 0;

const removeFromArray = (array, i) => array.splice(i, 1)[0];

const removeItemFromArray = (array, item) =>
  removeFromArray(array, array.indexOf(item));

const removeRandomFromArray = (array) =>
  removeFromArray(array, randomIndex(array));

const getRandomFromArray = (array) => array[randomIndex(array) | 0];

// 音乐
let playState = true;
function testAutoPlay() {
  // 返回一个promise以告诉调用者检测结果
  return new Promise((resolve) => {
    if (playState) {
      let audio = document.createElement("audio");
      audio.src = "music.mp3";
      //循环播放，如果不需要可注释
      audio.loop = "loop";
      document.body.appendChild(audio);
      let autoplay = true;
      // play返回的是一个promise
      audio
        .play()
        .then(() => {
          // 支持自动播放
          autoplay = true;
          console.log("正常播放");
        })
        .catch((err) => {
          // 不支持自动播放
          console.log("不支持播放");
          autoplay = false;
        })
        .finally((e) => {
          resolve(autoplay);
        });
      playState = false;
    } else {
      resolve(false);
    }
  });
}

let audioInfo = {
  autoplay: false,
  testAutoPlay() {
    return testAutoPlay();
  },
  // 监听页面的点击事件，一旦点过了就能autoplay了
  setAutoPlayWhenClick() {
    function setAutoPlay() {
      // 设置自动播放为true
      audioInfo.autoplay = true;
      document.removeEventListener("click", setAutoPlay);
      document.removeEventListener("touchend", setAutoPlay);
    }
    document.addEventListener("click", setAutoPlay);
    document.addEventListener("touchend", setAutoPlay);
  },
  init() {
    // 检测是否能自动播放
    audioInfo.testAutoPlay().then((autoplay) => {
      if (!audioInfo.autoplay) {
        audioInfo.autoplay = autoplay;
      }
    });
    // 用户点击交互之后，设置成能自动播放
    audioInfo.setAutoPlayWhenClick();
  },
};

const resetPeep = ({ stage, peep }) => {
  const direction = Math.random() > 0.5 ? 1 : -1;

  // GSAP是第三方动画引擎类库 easing就是缓动的意思，那什么是缓动？缓动是一种非匀速的线性运动，“缓”的意思有缓冲的意思，表示一种点与点之间的速度的变化
  // 
  // 使用 ease 函数将随机值倾斜到较低的值

  const offsetY = 100 - 250 * gsap.parseEase("power2.in")(Math.random());
  const startY = stage.height - peep.height + offsetY;
  let startX;
  let endX;

  if (direction === 1) {
    startX = -peep.width;
    endX = stage.width;
    peep.scaleX = 1;
  } else {
    startX = stage.width + peep.width;
    endX = 0;
    peep.scaleX = -1;
  }

  peep.x = startX;
  peep.y = startY;
  peep.anchorY = startY;

  return {
    startX,
    startY,
    endX,
  };
};

// 人物移动过程中 x及y方向的移动
const normalWalk = ({ peep, props }) => {
  const { startX, startY, endX } = props;

  const xDuration = 10;
  const yDuration = 0.25;

  const tl = gsap.timeline();
  tl.timeScale(randomRange(0.5, 1.5));
  tl.to(
    peep,
    {
      duration: xDuration,
      x: endX,
      ease: "none",
    },
    0
  );
  tl.to(
    peep,
    {
      duration: yDuration,
      repeat: xDuration / yDuration,
      yoyo: true,
      y: startY - 10,
    },
    0
  );

  return tl;
};

const walks = [normalWalk];


class Peep {
  constructor({ image, rect }) {
    this.image = image;
    this.setRect(rect);

    this.x = 0;
    this.y = 0;
    this.anchorY = 0;
    this.scaleX = 1;
    this.walk = null;
  }

  setRect(rect) {
    this.rect = rect;
    this.width = rect[2];
    this.height = rect[3];

    this.drawArgs = [this.image, ...rect, 0, 0, this.width, this.height];
  }

  render(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scaleX, 1);
    ctx.drawImage(...this.drawArgs);
    ctx.restore();
  }
}

const img = document.createElement("img");
img.onload = init;
img.src = config.src;

const canvas = document.querySelector("#canvas");
// 用于在画布上绘图的环境
const ctx = canvas.getContext("2d");

const stage = {
  width: 0,
  height: 0,
};

const allPeeps = [];
const availablePeeps = [];
const crowd = [];
function active() {
  const test = document.querySelector('.ly-box23').classList.add('active');
}

function init() {
  createPeeps();

  // 调整大小-填充阶段
  resize();

  gsap.ticker.add(render);
  window.addEventListener("resize", resize);
  setTimeout('active()',3000)
}

// 创建人物 15*7
function createPeeps() {
  const { rows, cols } = config;
  const { naturalWidth: width, naturalHeight: height } = img;
  const total = rows * cols;
  const rectWidth = width / rows;
  const rectHeight = height / cols;

  for (let i = 0; i < total; i++) {
    allPeeps.push(
      new Peep({
        image: img,
        rect: [
          (i % rows) * rectWidth,
          ((i / rows) | 0) * rectHeight,
          rectWidth,
          rectHeight,
        ],
      })
    );
  }
}

// 填充人物
function resize() {
  stage.width = canvas.clientWidth;
  stage.height = canvas.clientHeight;
  canvas.width = stage.width * devicePixelRatio;
  canvas.height = stage.height * devicePixelRatio;

  crowd.forEach((peep) => {
    peep.walk.kill();
  });

  crowd.length = 0;
  availablePeeps.length = 0;
  availablePeeps.push(...allPeeps);

  initCrowd();
}

function initCrowd() {
  while (availablePeeps.length) {
    // 设置随机的两个进程
    addPeepToCrowd().walk.progress(Math.random());
  }
}

function addPeepToCrowd() {
  const peep = removeRandomFromArray(availablePeeps);
  const walk = getRandomFromArray(walks)({
    peep,
    props: resetPeep({
      peep,
      stage,
    }),
  }).eventCallback("onComplete", () => {
    removePeepFromCrowd(peep);
    addPeepToCrowd();
  });

  peep.walk = walk;

  crowd.push(peep);
  crowd.sort((a, b) => a.anchorY - b.anchorY);

  return peep;
}

function removePeepFromCrowd(peep) {
  removeItemFromArray(crowd, peep);
  availablePeeps.push(peep);
}

function render() {
  canvas.width = canvas.width;
  ctx.save();
  ctx.scale(devicePixelRatio, devicePixelRatio);

  crowd.forEach((peep) => {
    peep.render(ctx);
  });

  ctx.restore();
}
document.addEventListener("click", () => {
  audioInfo.init();
});
