---
title: 'Modularity, Objects, and State'
pubDate: '2026-01-17'
chapter: 3
---
- So far, we’ve learned how to build abstractions with procedures and data.
- Abstraction is crucial to deal with complexity, but it’s not the whole story. We also need organizational principles to guide the overall design of the program.
- We need strategies to help us build _modular_ systems, which naturally divide into coherent parts that can be separately maintained.

> If we have been successful in our system organization, then to add a new feature or debug an old one we will have to work on only a localized part of the system. (Chapter 3)

In this chapter we will investigate two prominent organizational strategies.
The first views the system as a collection of distinct objects that change over time.
The second focuses on streams of information that flow in the system.
Both approaches raise significant linguistic issues in our programming.

- In this chapter we will investigate two prominent organizational strategies.
- The first views the system as a collection of distinct _objects_ that change over time.
- The second focuses on _streams_ of information that flow in the system.
- Both approaches raise significant linguistic issues in our programming.