# ML-Vizard 🧮

> **A visual-first, interactive machine learning curriculum — built in the browser.**

Every formula animated. Every concept interactive. From vector dot products to neural network backpropagation — no installation required for learners.

🌐 **Live site:** [ml-vizard.netlify.app](https://ml-vizard.netlify.app) *(update once deployed)*

---

## Labs

| Lab | Topics |
|---|---|
| 🧮 **Math Lab** | Vectors, Dot Product, Norms (L1/L2/Lp), Gradient Fields, Chain Rule |
| 📊 **Stats Lab** | Probability Distributions, Bayes Theorem, Correlation, Entropy, MLE |
| 📈 **Regression Lab** | Linear Regression, Gradient Descent, Polynomial, Ridge & Lasso |
| 🧠 **Neural Net Lab** | Architecture Builder, Activations, Forward Pass, Live XOR Training |
| ⚡ **Optimizer Race** | SGD vs Momentum vs AdaGrad vs RMSProp vs Adam — on the same surface |
| 🖼 **Image Lab** | Transpose, Convolution, SVD, Rotation, Colour Transform pipeline |
| 🎵 **Audio Lab** | Waveform matrix, FFT spectrum, STFT spectrogram |
| 📐 **Concepts** | Animated mini-demos for linear algebra concepts |

---

## Tech Stack

- **Vite** — build tool
- **Vanilla JS + Canvas API** — all visualisations
- **GSAP** — animations
- **KaTeX** — formula rendering
- **math.js** — matrix operations

## Run locally

```bash
npm install
npm run dev
# → open http://localhost:5173
```

## Build for production

```bash
npm run build
# output in dist/
```

## Deploy

Hosted on Netlify. See [`netlify.toml`](./netlify.toml) for config.
Every push to `main` triggers an automatic redeploy.
