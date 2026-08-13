const screens = [...document.querySelectorAll(".screen")];
const homeBtn = document.getElementById("homeBtn");

function showScreen(id) {
  screens.forEach(s => s.classList.toggle("active", s.id === id));
  homeBtn.classList.toggle("hidden", id === "homeScreen");
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (id === "findGame") startFindGame();
  if (id === "orangeGame") resetOrangeGame();
}

document.querySelectorAll("[data-open]").forEach(btn => {
  btn.addEventListener("click", () => showScreen(btn.dataset.open));
});

homeBtn.addEventListener("click", () => {
  stopFindTimer();
  showScreen("homeScreen");
});

/* ---------------------------
   GAME 1: FIND THE FATHER
--------------------------- */

const crowdLayer = document.getElementById("crowdLayer");
const roundText = document.getElementById("roundText");
const timerText = document.getElementById("timerText");
const scoreText = document.getElementById("scoreText");
const stationInstruction = document.getElementById("stationInstruction");
const findResult = document.getElementById("findResult");
const restartFindBtn = document.getElementById("restartFindBtn");

let findRound = 1;
let findScore = 0;
let timeLeft = 30;
let findTimer = null;
let roundLocked = false;

const coatPalette = ["#5c5148", "#6b4b42", "#3d4d50", "#6c6157", "#4b5961", "#765b45"];
const skinPalette = ["#c9966e", "#d2aa86", "#b98261", "#c9a27e"];
const hairPalette = ["#2a2927", "#3b312b", "#191918", "#4a372d"];

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function createPerson({ father = false, decoy = false, lane = 0 }) {
  const el = document.createElement("div");
  el.className = "person";
  if (father) el.classList.add("father");

  const direction = Math.random() > .5 ? "walk-right" : "walk-left";
  el.classList.add(direction);

  const scale = [0.70, 0.86, 1.03][lane];
  const y = [39, 30, 21][lane];
  el.style.bottom = `${y}%`;
  el.style.setProperty("--scale", scale);
  el.style.setProperty("--speed", `${random(10.5, 17)}s`);
  el.style.animationDelay = `${random(-16, -1)}s`;
  el.style.zIndex = 2 + lane;

  el.style.setProperty("--skin", skinPalette[Math.floor(Math.random() * skinPalette.length)]);
  el.style.setProperty("--hair", hairPalette[Math.floor(Math.random() * hairPalette.length)]);

  if (father) {
    el.style.setProperty("--coat", "#27484b");
    el.dataset.father = "true";
  } else {
    el.style.setProperty("--coat", decoy ? "#30494c" : coatPalette[Math.floor(Math.random() * coatPalette.length)]);
  }

  const head = document.createElement("div");
  head.className = "head";
  const hair = document.createElement("div");
  hair.className = "hair";
  const body = document.createElement("div");
  body.className = "body";
  const legs = document.createElement("div");
  legs.className = "legs";

  el.append(head, hair, body, legs);

  // 帽子：父親一定有；部分干擾人物也有。
  if (father || decoy || Math.random() < .18) {
    const hat = document.createElement("div");
    hat.className = "hat";
    el.appendChild(hat);
  }

  if (!father && Math.random() < .38) {
    const bag = document.createElement("div");
    bag.className = "bag";
    el.appendChild(bag);
  }

  // 偽裝人物略胖，但沒有完全符合父親服飾。
  if (decoy) {
    el.style.width = "66px";
    body.style.width = "58px";
    body.style.left = "4px";
    body.style.borderRadius = "24px 24px 12px 12px";
  }

  el.addEventListener("click", handlePersonClick);
  return el;
}

function populateCrowd(round) {
  crowdLayer.innerHTML = "";
  const count = 14 + round * 7;
  const fatherLane = Math.floor(Math.random() * 3);
  const fatherIndex = Math.floor(random(3, count - 2));

  for (let i = 0; i < count; i++) {
    const lane = Math.floor(Math.random() * 3);
    const father = i === fatherIndex;
    const decoyChance = round === 1 ? .06 : round === 2 ? .14 : .22;
    const decoy = !father && Math.random() < decoyChance;

    crowdLayer.appendChild(createPerson({
      father,
      decoy,
      lane: father ? fatherLane : lane
    }));
  }
}

function handlePersonClick(e) {
  if (roundLocked) return;
  const person = e.currentTarget;

  if (person.dataset.father === "true") {
    roundLocked = true;
    findScore += Math.max(100, timeLeft * 10);
    scoreText.textContent = findScore;
    person.style.animationPlayState = "paused";
    person.style.outline = "5px solid #f2c15f";
    person.style.outlineOffset = "6px";
    stationInstruction.textContent = "找到了！黑布小帽、深色衣著和較胖的身形都是重要線索。";

    setTimeout(() => {
      if (findRound < 3) {
        findRound++;
        roundText.textContent = findRound;
        timeLeft = Math.max(18, 32 - findRound * 4);
        timerText.textContent = timeLeft;
        roundLocked = false;
        populateCrowd(findRound);
        stationInstruction.textContent = "下一回合更難：留意相似衣著的干擾人物。";
      } else {
        finishFindGame(true);
      }
    }, 1400);
  } else {
    findScore = Math.max(0, findScore - 50);
    scoreText.textContent = findScore;
    stationInstruction.textContent = "不是他。不要只看衣服顏色，也要留意帽子和身形。";
    person.classList.add("wrong-shake");
    setTimeout(() => person.classList.remove("wrong-shake"), 350);
  }
}

function startFindGame() {
  stopFindTimer();
  findRound = 1;
  findScore = 0;
  timeLeft = 30;
  roundLocked = false;
  roundText.textContent = findRound;
  scoreText.textContent = findScore;
  timerText.textContent = timeLeft;
  findResult.classList.add("hidden");
  findResult.innerHTML = "";
  stationInstruction.textContent = "點擊你認為是父親的人物。";
  populateCrowd(findRound);

  findTimer = setInterval(() => {
    if (roundLocked) return;
    timeLeft--;
    timerText.textContent = timeLeft;
    if (timeLeft <= 0) finishFindGame(false);
  }, 1000);
}

function stopFindTimer() {
  if (findTimer) clearInterval(findTimer);
  findTimer = null;
}

function finishFindGame(success) {
  stopFindTimer();
  roundLocked = true;
  findResult.classList.remove("hidden");
  if (success) {
    findResult.innerHTML = `
      <strong>完成三個回合！</strong><br>
      你的得分是 <b>${findScore}</b>。<br>
      課文中的外貌描寫不是多餘資料：帽子、衣著、體型等細節，共同構成了「父親的背影」。
    `;
  } else {
    findResult.innerHTML = `
      <strong>時間到了。</strong><br>
      再試一次：不要只找「穿深色衣服的人」，要把 <b>帽子＋衣著＋體型</b> 三種線索一起使用。
    `;
  }
}

restartFindBtn.addEventListener("click", startFindGame);

/* ---------------------------
   GAME 2: ORANGE ACTIONS
--------------------------- */

const fatherActor = document.getElementById("fatherActor");
const actorOranges = document.getElementById("actorOranges");
const motionCaption = document.getElementById("motionCaption");
const actionFeedback = document.getElementById("actionFeedback");
const stepText = document.getElementById("stepText");
const energyText = document.getElementById("energyText");
const orangeResult = document.getElementById("orangeResult");
const actionButtons = [...document.querySelectorAll("#actionButtons button")];
const restartOrangeBtn = document.getElementById("restartOrangeBtn");

const actionOrder = [
  {
    key: "walk",
    state: "state-walk",
    caption: "父親慢慢走到月台邊。",
    feedback: "正確。先「走」到月台邊，準備越過鐵路。"
  },
  {
    key: "lean",
    state: "state-lean",
    caption: "父親探身下去，小心落到鐵路旁。",
    feedback: "正確。「探」寫出他身體向前、向下的動作。"
  },
  {
    key: "climb",
    state: "state-climb",
    caption: "他用雙手攀著上面的月台。",
    feedback: "正確。「攀」突出他需要用手借力，動作並不輕鬆。"
  },
  {
    key: "tuck",
    state: "state-tuck",
    caption: "兩腳再向上縮。",
    feedback: "正確。「縮」把吃力的動作具體呈現出來。"
  },
  {
    key: "tilt",
    state: "state-tilt",
    caption: "肥胖的身子微微向左傾。",
    feedback: "正確。「傾」讓讀者看見父親努力保持平衡的樣子。"
  },
  {
    key: "buy",
    state: "state-buy",
    caption: "終於買到橘子了。",
    feedback: "完成！這一連串細小動作，把父親的辛勞和愛寫得非常具體。"
  }
];

let orangeStep = 0;
let energy = 3;
let orangeLocked = false;

function resetOrangeGame() {
  orangeStep = 0;
  energy = 3;
  orangeLocked = false;

  fatherActor.className = "father-actor";
  actorOranges.classList.add("hidden");
  motionCaption.textContent = "父親準備去買橘子。";
  actionFeedback.textContent = "先觀察場景，再想一想：父親第一個動作是甚麼？";
  stepText.textContent = "0";
  energyText.textContent = "3";
  orangeResult.classList.add("hidden");
  orangeResult.innerHTML = "";

  actionButtons.forEach(btn => {
    btn.disabled = false;
    btn.classList.remove("correct");
  });
}

function setActorState(stateClass) {
  fatherActor.className = "father-actor";
  // 下一個 frame 才加 class，讓 transition 穩定生效
  requestAnimationFrame(() => fatherActor.classList.add(stateClass));
}

function handleAction(btn) {
  if (orangeLocked) return;

  const expected = actionOrder[orangeStep];
  const chosen = btn.dataset.action;

  if (chosen === expected.key) {
    setActorState(expected.state);
    motionCaption.textContent = expected.caption;
    actionFeedback.textContent = expected.feedback;
    btn.classList.add("correct");
    btn.disabled = true;

    orangeStep++;
    stepText.textContent = orangeStep;

    if (chosen === "buy") actorOranges.classList.remove("hidden");

    if (orangeStep >= actionOrder.length) {
      orangeLocked = true;
      actionButtons.forEach(b => b.disabled = true);
      orangeResult.classList.remove("hidden");
      orangeResult.innerHTML = `
        <strong>挑戰完成。</strong><br>
        作者沒有只寫「父親去買橘子」，而是逐個寫出 <b>走、探、攀、縮、傾</b>。
        這些動作詞讓讀者看見父親行動不便、攀爬吃力，也更能感受到他為兒子付出的心意。<br><br>
        <b>思考：</b> 如果刪去這些動作，只剩「父親去買了橘子」，感染力會有甚麼不同？
      `;
    }
  } else {
    energy--;
    energyText.textContent = energy;
    actionFeedback.textContent =
      energy > 0
        ? `次序不對。現在應該想一想「${expected.caption.replace("。","")}」之前，父親需要先做甚麼。`
        : "體力用完了。系統已替你保留正確進度，可以按「重新挑戰」再試一次。";

    btn.classList.add("wrong-shake");
    setTimeout(() => btn.classList.remove("wrong-shake"), 320);

    if (energy <= 0) {
      orangeLocked = true;
      actionButtons.forEach(b => b.disabled = true);
    }
  }
}

actionButtons.forEach(btn => btn.addEventListener("click", () => handleAction(btn)));
restartOrangeBtn.addEventListener("click", resetOrangeGame);
