const BUILD = 1102;
const BG_TLO = "img_tlo.png";

const splashHint = document.getElementById("splashHint");

function setHint(txt){
  if (splashHint) splashHint.textContent = txt;
  console.log(txt);
}

function setBg(src){
  const bg = document.getElementById("bg");
  if (bg) bg.style.backgroundImage = `url("${src}")`;
}

// 1) Ustaw tło
setBg(BG_TLO);

// 2) Główna sekwencja startowa z wyraźnymi krokami
(async () => {
  try{
    setHint(`BUILD ${BUILD}\nKrok 1/5: start modułów…`);

    // >>> Najczęstsza przyczyna zwisu: import Firebase nie dochodzi / blokada
    const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
    setHint(`BUILD ${BUILD}\nKrok 2/5: firebase-app OK`);

    const { getAuth, onAuthStateChanged, signInAnonymously } =
      await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js");
    setHint(`BUILD ${BUILD}\nKrok 3/5: firebase-auth OK`);

    const { getFirestore } =
      await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
    setHint(`BUILD ${BUILD}\nKrok 4/5: firebase-firestore OK`);

    // Twoje configi:
    const firebaseConfig = {
      apiKey: "AIzaSyCE-uY6HnDWdfKW03hioAlLM8BLj851fco",
      authDomain: "typer-b3087.firebaseapp.com",
      projectId: "typer-b3087",
      storageBucket: "typer-b3087.firebasestorage.app",
      messagingSenderId: "1032303131493",
      appId: "1:1032303131493:web:8cc41341f3e42415d6ff8c",
      measurementId: "G-5FBDH5G15N"
    };

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    setHint(`BUILD ${BUILD}\nKrok 5/5: Firebase zainicjalizowany\nCzekam na logowanie anonimowe…`);

    await new Promise((resolve, reject) => {
      const unsub = onAuthStateChanged(auth, async (user) => {
        try{
          if (user) {
            unsub();
            resolve(user);
            return;
          }
          await signInAnonymously(auth);
        }catch(e){
          reject(e);
        }
      });
      // jakby event nie przyszedł:
      setTimeout(() => reject(new Error("Auth timeout (12s) – sprawdź czy Anonymous Auth jest włączone w Firebase.")), 12000);
    });

    setHint(`OK ✅\nFirebase Auth działa.\nTeraz możemy wrócić do pełnego UI pokoju.`);
    // Tu w kolejnym kroku wkleimy pełny UI (rooms/room) – najpierw musimy mieć pewność, że start przechodzi.

  }catch(err){
    console.error(err);
    setHint("BŁĄD STARTU:\n" + (err?.message || String(err)));
    // błąd i tak pokaże się też w index.html (czerwone pole)
    throw err;
  }
})();
