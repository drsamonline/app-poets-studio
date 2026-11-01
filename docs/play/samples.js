/* samples.js — the poems the app can load to show what it measures.
 *
 * A sample is a starting point, never a suggestion: each one exists so the
 * measure can be seen working on something that is already a poem, and so a
 * link can open one specific case (#/sonnet, #/haiku, #/ghazal, #/haiku-off).
 *
 * `haiku-off` is deliberately one syllable long in its first line. The app's
 * job is to say so, and the tests assert that it does.
 *
 * No dependencies. Works in the browser (window.POEM_SAMPLES) and in Node
 * (require("./samples.js")).
 *
 * MIT. (c) 2026 Dr Sohil Momin.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.POEM_SAMPLES = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var SAMPLES = {
    sonnet: {
      form: "sonnet",
      title: "Sample sonnet \u2014 iambic pentameter, ABAB CDCD EFEF GG",
      expect: "pass",
      text: [
        "I set the words in rows and let them stand",
        "and count the beats the way a reader would",
        "the metre is a ruler in the hand",
        "and measures what I made, and not what should",
        "it keeps the promise that the count is true",
        "and I have nothing but the counted time",
        "and show the line its shape, and see it through",
        "and let the sound decide the word and rhyme",
        "no engine writes the image or the light",
        "no hand is at the margin of the page",
        "and nothing in the workshop knows the night",
        "except the poem, written for an age",
        "so take the measure, keep the words, and see",
        "the words are yours; the counting is for me"
      ].join("\n")
    },

    haiku: {
      form: "haiku",
      title: "Sample haiku \u2014 5 \u00b7 7 \u00b7 5",
      expect: "pass",
      text: "cold kitchen window\nthe kettle keeps its own time\nsteam writes on the glass"
    },

    "haiku-off": {
      form: "haiku",
      title: "Sample haiku \u2014 first line one syllable long, on purpose",
      expect: "fail",
      text: "the winter harbour light\nthe ferry pulls away now\nno one is waving"
    },

    "ghazal-hindi": {
      form: "ghazal",
      title: "\u0936\u093e\u092e \u2014 a ghazal in Devanagari, 17 m\u0101tr\u0101 a line",
      expect: "pass",
      text: [
        "\u0936\u093e\u092e \u0922\u0932\u0924\u0940 \u0939\u0948 \u0924\u0947\u0930\u0947 \u0928\u093e\u092e \u0938\u0947 \u092b\u093f\u0930",
        "\u0930\u093e\u0924 \u092d\u0930 \u091c\u093e\u0917\u0947 \u0939\u094b \u0924\u0947\u0930\u0947 \u0928\u093e\u092e \u0938\u0947 \u092b\u093f\u0930",
        "\u0927\u0942\u092a \u0906\u0924\u0940 \u0939\u0948 \u0924\u0947\u0930\u0947 \u0928\u093e\u092e \u0938\u0947 \u092b\u093f\u0930",
        "\u0938\u0941\u092c\u0939 \u0939\u094b\u0924\u0940 \u0939\u0948 \u0924\u094b \u0915\u0941\u091b \u0915\u093e\u092e \u0938\u0947 \u092b\u093f\u0930"
      ].join("\n")
    },

    tanka: {
      form: "tanka",
      title: "Sample tanka \u2014 5 \u00b7 7 \u00b7 5 \u00b7 7 \u00b7 7",
      expect: "pass",
      text: [
        "the winter harbour",
        "the ferry pulls away now",
        "no one is waving",
        "and the gulls go on counting",
        "the minutes I did not spend"
      ].join("\n")
    },

    ghazal: {
      form: "ghazal",
      title: "Sample ghazal \u2014 radif \u201cagain\u201d",
      expect: "pass",
      text: [
        "I keep the letter that I never sent again",
        "and read the sentence that I never meant again",
        "the ink has dried, the page still holds its dent again",
        "and all the hours that I had spent again"
      ].join("\n")
    }
  };

  return SAMPLES;
});
