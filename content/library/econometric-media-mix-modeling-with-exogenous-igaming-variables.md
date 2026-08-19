---
title: Econometric Media Mix Modeling with Exogenous iGaming Variables
subtitle: 'Incorporating Bonus Mechanics, Sporting Calendars, and Regulatory Shocks'
date: '2026-06-01'
medium: Paper
category: Econometrics
author: Timothy Solomon
tags:
  - MMM
  - Econometrics
  - iGaming
  - Marketing
productRefs:
  - jurnii-mmm
featureRefs:
  - market-trends
solutionRefs:
  - attribution
coverImage: >-
  /assets/library/econometric-media-mix-modeling-with-exogenous-igaming-variables/cover.png
---

# Abstract

Traditional marketing mix modeling assumes stationary response curves and treats promotions as homogeneous spend variables. In iGaming operations, promotional mechanics (free bets, deposit matches, reload bonuses) interact non-linearly with sporting calendars and regulatory intervention.

## 1. Model Formalization

We formulate the response model $Y_t$ at time $t$ as:

$$Y_t = \alpha + \sum_{m=1}^M \beta_m \cdot f(\text{Spend}_{m,t}; \theta_m) + \sum_{k=1}^K \gamma_k \cdot \text{Bonus}_{k,t} + \delta \cdot \text{Calendar}_t + \epsilon_t$$

Where:
- $f(\text{Spend}_{m,t}; \theta_m)$ represents the adstock transformation and Hill saturation function for media channel $m$.
- $\text{Bonus}_{k,t}$ isolates the bonus intensity vector.
- $\text{Calendar}_t$ accounts for major tournament spikes.

## 2. Saturation and Adstock

The Hill saturation function is defined as:

$$\text{Hill}(x; K, S) = \frac{x^S}{K^S + x^S}$$

This allows commercial teams to identify exact diminishing return thresholds per acquisition channel.
