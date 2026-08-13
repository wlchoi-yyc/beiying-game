const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const screens = $$(".screen");
const homeBtn = $("#homeBtn");
const brandBtn = $("#brandBtn");

function showScreen(id) {
  screens.forEach((screen) => screen.classList.toggle("active", screen.id === id));
  homeBtn.classList.toggle("hidden", id === "homeScreen");

  if (id !== "findGame") stopFindTimer();
  if (id !== "orangeGame") cancelOrangeMotion();

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (id === "findGame") startFindGame();
  if (id === "orangeGame") resetOrangeGame();
}

$$('[data-open]').forEach((button) => {
  button.addEventListener("click", () => showScreen(button.dataset.open));
});

[homeBtn, brandBtn].forEach((button) => {
  button.addEventListener("click", () => showScreen("homeScreen"));
});

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function choose(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/* -------------------------------------------------------------------------- */
/* Game 1 — Find the father                                                   */
/* -------------------------------------------------------------------------- */

const crowdLayer = $("#crowdLayer");
const station = $("#station");
const stationMessage = $("#stationMessage");
const roundText = $("#roundText");
const timerText = $("#timerText");
const scoreText = $("#scoreText");
const findResult = $("#findResult");
const restartFindBtn = $("#restartFindBtn");
const roundCurtain = $("#roundCurtain");
const curtainKicker = $("#curtainKicker");
const curtainTitle = $("#curtainTitle");
const curtainNote = $("#curtainNote");

const roundTimes = [38, 34, 30];
const laneSettings = [
  { bottom: 39, scale: 0.64, z: 10 },
  { bottom: 31, scale: 0.79, z: 14 },
  { bottom: 22, scale: 0.98, z: 18 },
];

const travellerPalettes = [
  { coat: "#5f5348", light: "#78695b", trousers: "#313536" },
  { coat: "#684b40", light: "#805f51", trousers: "#343333" },
  { coat: "#3e5152", light: "#587071", trousers: "#273233" },
  { coat: "#6a6257", light: "#81776a", trousers: "#353837" },
  { coat: "#4b5960", light: "#66757c", trousers: "#2b3336" },
  { coat: "#705942", light: "#8b7055", trousers: "#363330" },
  { coat: "#4e4542", light: "#675a55", trousers: "#2e3030" },
];

const skinTones = ["#c18b68", "#d0a07e", "#ad7657", "#c49472"];
const hairTones = ["#252321", "#342d29", "#171918", "#3e3028"];
const scarfTones = ["#87483a", "#365c5c", "#8b6c37", "#584a6e"];

let findRound = 1;
let findScore = 0;
let timeLeft = roundTimes[0];
let findTimer = null;
let findLocked = false;
let findRunToken = 0;

function commuterMarkup() {
  return `
    <span class="person-shadow"></span>
    <span class="walker">
      <span class="person-head-group">
        <span class="person-head"></span>
        <span class="person-hair"></span>
        <span class="person-hat"></span>
      </span>
      <span class="person-torso"></span>
      <span class="person-arm left"></span>
      <span class="person-arm right"></span>
      <span class="person-leg left"><span class="shoe"></span></span>
      <span class="person-leg right"><span class="shoe"></span></span>
      <span class="person-bag"></span>
    </span>
  `;
}

function createCommuter({ father = false, decoy = false, lane = 1, index = 0 }) {
  const traveller = document.createElement("button");
  const direction = Math.random() > 0.5 ? "move-right" : "move-left";
  const laneStyle = laneSettings[lane];
  const palette = choose(travellerPalettes);
  const speed = father ? random(15, 18.5) : random(11.5, 20);

  traveller.type = "button";
  traveller.className = `commuter ${direction}`;
  traveller.innerHTML = commuterMarkup();
  traveller.setAttribute("aria-label", "月台上一名背向你的旅客");
  traveller.style.bottom = `${laneStyle.bottom}%`;
  traveller.style.zIndex = laneStyle.z + Math.floor(index / 5);
  traveller.style.setProperty("--scale", laneStyle.scale);
  traveller.style.setProperty("--facing", direction === "move-right" ? "1" : "-1");
  traveller.style.setProperty("--speed", `${speed}s`);
  traveller.style.setProperty("--skin", choose(skinTones));
  traveller.style.setProperty("--hair", choose(hairTones));

  if (father) {
    traveller.classList.add("father", "has-hat");
    traveller.dataset.father = "true";
    // Keep the target inside the visible part of the platform when a round starts.
    traveller.style.animationDelay = `${-speed * random(0.18, 0.72)}s`;
  } else {
    traveller.style.setProperty("--coat", decoy ? "#293f40" : palette.coat);
    traveller.style.setProperty("--coat-light", decoy ? "#40595a" : palette.light);
    traveller.style.setProperty("--trousers", palette.trousers);
    traveller.style.animationDelay = `${-speed * random(0.03, 0.96)}s`;

    if (decoy) {
      if (Math.random() > 0.48) traveller.classList.add("has-hat");
      if (Math.random() > 0.55) traveller.classList.add("decoy-wide");
    } else {
      if (Math.random() < 0.22) traveller.classList.add("has-hat");
      if (Math.random() < 0.27) traveller.classList.add("has-bag");
      if (Math.random() < 0.24) {
        traveller.classList.add("has-scarf");
        traveller.style.setProperty("--scarf", choose(scarfTones));
      }
      if (Math.random() < 0.13) traveller.classList.add("decoy-wide");
    }
  }

  traveller.addEventListener("click", handleCommuterClick);
  return traveller;
}

function populateCrowd(round) {
  crowdLayer.replaceChildren();
  station.classList.remove("has-found");

  const count = 13 + round * 5;
  const fatherIndex = Math.floor(random(2, count - 2));
  const fatherLane = round === 1 ? choose([1, 2]) : Math.floor(random(0, 3));
  const decoyChance = [0.06, 0.14, 0.23][round - 1];

  for (let i = 0; i < count; i += 1) {
    const father = i === fatherIndex;
    const decoy = !father && Math.random() < decoyChance;
    const lane = father ? fatherLane : Math.floor(random(0, 3));
    crowdLayer.append(createCommuter({ father, decoy, lane, index: i }));
  }
}

function setStationMessage(text, mood = "normal") {
  stationMessage.lastChild.textContent = ` ${text}`;
  stationMessage.dataset.mood = mood;
}

function pauseCrowd(paused) {
  $$(".commuter", crowdLayer).forEach((traveller) => {
    traveller.style.animationPlayState = paused ? "paused" : "running";
  });
}

async function handleCommuterClick(event) {
  if (findLocked) return;

  const traveller = event.currentTarget;
  if (traveller.dataset.father === "true") {
    findLocked = true;
    stopFindTimer();
    findScore += 120 + timeLeft * 12;
    scoreText.textContent = String(findScore);
    traveller.classList.add("found");
    station.classList.add("has-found");
    pauseCrowd(true);
    setStationMessage("找到了！帽子、衣著和身形三組線索都吻合。", "success");

    const token = findRunToken;
    await wait(1450);
    if (token !== findRunToken) return;

    if (findRound < 3) {
      findRound += 1;
      await showRoundCurtain(findRound, token);
      if (token !== findRunToken) return;
      startFindRound();
    } else {
      finishFindGame(true);
    }
    return;
  }

  findScore = Math.max(0, findScore - 45);
  scoreText.textContent = String(findScore);
  traveller.classList.remove("wrong");
  void traveller.offsetWidth;
  traveller.classList.add("wrong");
  setStationMessage("不是他。別只看衣服顏色，再核對帽子與體型。", "warning");
  window.setTimeout(() => traveller.classList.remove("wrong"), 420);
}

function startFindRound() {
  stopFindTimer();
  findLocked = false;
  timeLeft = roundTimes[findRound - 1];
  roundText.textContent = String(findRound);
  timerText.textContent = String(timeLeft);
  populateCrowd(findRound);

  const prompts = [
    "點擊你認為是父親的人物",
    "人潮增加了：留意穿相似衣服的旅客",
    "最後一回合：把三組線索同時使用",
  ];
  setStationMessage(prompts[findRound - 1]);

  findTimer = window.setInterval(() => {
    if (findLocked || document.hidden) return;
    timeLeft -= 1;
    timerText.textContent = String(timeLeft);
    if (timeLeft <= 0) finishFindGame(false);
  }, 1000);
}

function startFindGame() {
  findRunToken += 1;
  findRound = 1;
  findScore = 0;
  findLocked = false;
  roundText.textContent = "1";
  scoreText.textContent = "0";
  findResult.classList.add("hidden");
  findResult.replaceChildren();
  roundCurtain.classList.add("hidden");
  startFindRound();
}

function stopFindTimer() {
  if (findTimer) window.clearInterval(findTimer);
  findTimer = null;
}

function showRoundCurtain(round, token) {
  const labels = [
    null,
    ["第二回合", "人潮更密集了", "相似衣著的干擾人物開始增加"],
    ["最後回合", "只憑顏色並不足夠", "同時核對帽子、衣著與身形"],
  ];
  const [kicker, title, note] = labels[round];
  curtainKicker.textContent = kicker;
  curtainTitle.textContent = title;
  curtainNote.textContent = note;
  roundCurtain.classList.remove("hidden");

  return wait(1150).then(() => {
    if (token === findRunToken) roundCurtain.classList.add("hidden");
  });
}

function finishFindGame(success) {
  stopFindTimer();
  findLocked = true;
  pauseCrowd(true);
  findResult.classList.remove("hidden");

  if (success) {
    findResult.innerHTML = `
      <strong>三個回合完成，你找到了父親的背影。</strong><br />
      本次得分是 <b>${findScore}</b>。作者寫「黑布小帽、黑布大馬褂、深青布棉袍」和肥胖的身形，並非堆砌資料；這些細節合起來，才構成一個可以被兒子在人海中認出的父親。
      <div class="result-actions"><button class="outline-btn" type="button" data-find-restart>再玩一次</button></div>
    `;
  } else {
    setStationMessage("時間到了。下次把三類線索合起來判斷。", "warning");
    findResult.innerHTML = `
      <strong>這一回合時間到了。</strong><br />
      不要只找「穿深色衣服的人」。先找黑布小帽，再核對黑布大馬褂、深青布棉袍和較胖的身形，便能逐步排除干擾人物。
      <div class="result-actions"><button class="outline-btn" type="button" data-find-restart>重新挑戰</button></div>
    `;
  }

  $("[data-find-restart]", findResult).addEventListener("click", startFindGame);
  findResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

restartFindBtn.addEventListener("click", startFindGame);

/* -------------------------------------------------------------------------- */
/* Game 2 — Reconstruct the orange-buying actions                             */
/* -------------------------------------------------------------------------- */

const fatherRig = $("#fatherRig");
const motionCaption = $("#motionCaption");
const actionButtons = $("#actionButtons");
const actionFeedback = $("#actionFeedback");
const stepText = $("#stepText");
const energyText = $("#energyText");
const progressRail = $("#progressRail");
const lockIndicator = $("#lockIndicator");
const orangeResult = $("#orangeResult");
const restartOrangeBtn = $("#restartOrangeBtn");
const replayBtn = $("#replayBtn");

const actions = [
  {
    key: "walk",
    verb: "走",
    label: "走到月台邊",
    hint: "先接近鐵路",
    caption: "父親蹣跚地走到月台邊，步伐緩慢而沉重。",
    feedback: "先寫「走」，交代父親由原處移到月台邊，為越過鐵路作準備。",
    duration: 1800,
  },
  {
    key: "lean",
    verb: "探",
    label: "探身下去",
    hint: "身體向前、向下",
    caption: "他把上身向前探，小心地下到鐵道旁。",
    feedback: "「探」不只是向前看，也寫出身體向前、向下伸展和試探落腳的位置。",
    duration: 1550,
  },
  {
    key: "climb",
    verb: "攀",
    label: "用雙手攀著",
    hint: "雙手先找支點",
    caption: "父親伸高手臂，用雙手攀住對面月台的邊緣。",
    feedback: "「攀」顯示他不能輕鬆跨上去，必須用雙手抓住高處借力。",
    duration: 1900,
  },
  {
    key: "tuck",
    verb: "縮",
    label: "兩腳向上縮",
    hint: "收起雙腿借力",
    caption: "他以雙臂支撐身體，再把兩腳努力向上縮。",
    feedback: "「縮」把雙腿收起、全身用力的瞬間寫得具體，也突出了攀爬的吃力。",
    duration: 1450,
  },
  {
    key: "tilt",
    verb: "傾",
    label: "身子微微向左傾",
    hint: "轉移重心上月台",
    caption: "肥胖的身子微微向左傾，努力把重心移到月台上。",
    feedback: "「傾」讓讀者看見他如何轉移重心、保持平衡；一個細字便有畫面。",
    duration: 1650,
  },
  {
    key: "buy",
    verb: "買",
    label: "買橘後返回",
    hint: "抱著橘子往回走",
    caption: "父親走到攤前買橘子，再抱著一袋橘子慢慢回來。",
    feedback: "一連串吃力的動作，最後只為替兒子買幾個橘子；父愛因此變得可見。",
    duration: 3200,
  },
];

let orangeStep = 0;
let energy = 3;
let orangeLocked = false;
let orangeRunToken = 0;

function actionButtonMarkup(action) {
  return `
    <button class="action-card" type="button" data-action="${action.key}">
      <i>${action.verb}</i>
      <span>${action.label}<small>${action.hint}</small></span>
    </button>
  `;
}

function renderActionButtons() {
  actionButtons.innerHTML = shuffle(actions).map(actionButtonMarkup).join("");
  $$(".action-card", actionButtons).forEach((button) => {
    button.addEventListener("click", () => handleActionChoice(button));
  });
}

function setFeedback(type, icon, text) {
  actionFeedback.className = `action-feedback${type ? ` ${type}` : ""}`;
  actionFeedback.innerHTML = `<span class="feedback-icon">${icon}</span><p>${text}</p>`;
}

function setCaption(kicker, text) {
  motionCaption.innerHTML = `<small>${kicker}</small><strong>${text}</strong>`;
}

function updateEnergy() {
  const hearts = `${"♥ ".repeat(energy)}${"♡ ".repeat(3 - energy)}`.trim();
  energyText.textContent = hearts;
  energyText.setAttribute("aria-label", `尚餘 ${energy} 次機會`);
}

function updateProgress() {
  $$("span", progressRail).forEach((item, index) => {
    item.classList.toggle("done", index < orangeStep);
    item.classList.toggle("active", index === orangeStep && orangeStep < actions.length);
  });
  stepText.textContent = String(orangeStep);
}

function setButtonsBusy(busy) {
  $$(".action-card", actionButtons).forEach((button) => {
    const completed = button.classList.contains("correct");
    button.disabled = completed || busy || energy <= 0;
  });
}

function setMotionLock(moving, text = "請選擇") {
  lockIndicator.textContent = text;
  lockIndicator.classList.toggle("moving", moving);
}

function cancelOrangeMotion() {
  orangeRunToken += 1;
  orangeLocked = true;
  fatherRig.className = "father-rig pose-start";
}

function resetOrangeGame() {
  orangeRunToken += 1;
  orangeStep = 0;
  energy = 3;
  orangeLocked = false;
  fatherRig.className = "father-rig pose-start";
  setCaption("準備", "父親望向對面月台的橘子攤。");
  setFeedback("", "想", "先看父親所在的位置：他要到對面月台，第一步應做甚麼？");
  setMotionLock(false);
  updateEnergy();
  updateProgress();
  renderActionButtons();
  orangeResult.classList.add("hidden");
  orangeResult.replaceChildren();
  replayBtn.classList.add("hidden");
}

function waitForRootAnimation(duration, token) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      fatherRig.removeEventListener("animationend", onEnd);
      window.clearTimeout(fallback);
      resolve(token === orangeRunToken);
    };
    const onEnd = (event) => {
      if (event.target === fatherRig) finish();
    };
    const fallback = window.setTimeout(finish, duration + 180);
    fatherRig.addEventListener("animationend", onEnd);
  });
}

async function animateFather(action, token) {
  fatherRig.className = `father-rig perform-${action.key}`;
  const valid = await waitForRootAnimation(action.duration, token);
  if (!valid) return false;
  fatherRig.className = `father-rig pose-${action.key}`;
  return true;
}

async function handleActionChoice(button) {
  if (orangeLocked) return;

  const expected = actions[orangeStep];
  const chosen = button.dataset.action;

  if (chosen !== expected.key) {
    energy -= 1;
    updateEnergy();
    button.classList.remove("is-wrong");
    void button.offsetWidth;
    button.classList.add("is-wrong");
    window.setTimeout(() => button.classList.remove("is-wrong"), 420);

    if (energy > 0) {
      setFeedback("warning", "再", `次序不對。留意父親目前仍在${orangeStep === 0 ? "近處月台" : "上一個動作的位置"}，下一步需要先完成甚麼？`);
      return;
    }

    orangeLocked = true;
    setButtonsBusy(true);
    setMotionLock(false, "暫停");
    setFeedback("warning", "停", `三次機會已用完。正確的下一個動作是「${expected.verb}：${expected.label}」。可保留觀察後重新挑戰。`);
    orangeResult.classList.remove("hidden");
    orangeResult.innerHTML = `
      <strong>先別急，動作描寫要逐格閱讀。</strong><br />
      看清父親目前的位置，再問：「要到下一個位置，身體必須先做甚麼？」這樣便能從空間關係推斷動作次序。
    `;
    return;
  }

  const token = orangeRunToken;
  orangeLocked = true;
  button.classList.add("correct");
  setButtonsBusy(true);
  setMotionLock(true, "動作中");
  setCaption(`${expected.verb}・第 ${orangeStep + 1} 步`, expected.caption);
  setFeedback("", "看", "留意手臂、雙腿和身體重心如何一起改變……");

  const completed = await animateFather(expected, token);
  if (!completed) return;

  orangeStep += 1;
  updateProgress();
  setFeedback("success", "對", expected.feedback);

  if (orangeStep >= actions.length) {
    finishOrangeGame();
    return;
  }

  orangeLocked = false;
  setButtonsBusy(false);
  setMotionLock(false);
}

function finishOrangeGame() {
  orangeLocked = true;
  setButtonsBusy(true);
  setMotionLock(false, "已完成");
  replayBtn.classList.remove("hidden");
  orangeResult.classList.remove("hidden");
  orangeResult.innerHTML = `
    <strong>六個動作全部完成。</strong><br />
    作者沒有概括地寫「父親去買了橘子」，而是逐一寫出 <b>走、探、攀、縮、傾</b>。讀者因此看得見父親如何運用雙手、雙腿和全身的力量，也感受到他行動不便仍堅持為兒子付出的心意。<br />
    <b>思考：</b>若刪去這些動作，只留下「父親去買橘子」，文章的感染力會有甚麼不同？
  `;
  orangeResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

async function replayFullSequence() {
  if (!replayBtn || orangeRunToken < 0) return;
  orangeRunToken += 1;
  const token = orangeRunToken;
  orangeLocked = true;
  setButtonsBusy(true);
  setMotionLock(true, "完整重播");
  fatherRig.className = "father-rig pose-start";
  setCaption("完整重播", "把六個動作連起來觀察。");
  await wait(380);

  for (let index = 0; index < actions.length; index += 1) {
    if (token !== orangeRunToken) return;
    const action = actions[index];
    setCaption(`${action.verb}・第 ${index + 1} 步`, action.caption);
    const completed = await animateFather(action, token);
    if (!completed) return;
    await wait(index === actions.length - 1 ? 0 : 180);
  }

  if (token !== orangeRunToken) return;
  setCaption("完成", "父親抱著橘子，小心地回來了。");
  setFeedback("success", "愛", "把動作連起來看，父親的笨拙、吃力與對兒子的關愛便同時呈現在眼前。");
  setMotionLock(false, "重播完成");
}

restartOrangeBtn.addEventListener("click", resetOrangeGame);
replayBtn.addEventListener("click", replayFullSequence);

// The home screen is the initial state. This also provides a predictable reset
// when the file is opened directly from a computer or from GitHub Pages.
showScreen("homeScreen");
