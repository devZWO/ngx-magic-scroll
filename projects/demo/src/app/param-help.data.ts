export interface ParamDocLink {
  readonly label: string;
  readonly url: string;
}

export type ParamScope = 'provideMagicScroll' | '[scrollOptions]' | 'scrollTo' | 'demo';

export interface ParamHelpInfo {
  readonly id: string;
  readonly title: string;
  readonly propertyKey?: string;
  readonly summary: string;
  readonly impact: string;
  readonly scopes: readonly ParamScope[];
  readonly docLinks: readonly ParamDocLink[];
}

export const PARAM_HELP_INFO: Record<string, ParamHelpInfo> = {
  behavior: {
    id: 'behavior',
    title: 'Scroll Behavior',
    propertyKey: 'behavior',
    summary:
      'Controls whether scrolling to anchors or restoring scroll positions animates smoothly or jumps instantly.',
    impact:
      "'instant' prevents disorienting jumps and reduces layout shift latency, while 'smooth' provides a visual transition during user interactions.",
    scopes: ['provideMagicScroll', '[scrollOptions]', 'scrollTo'],
    docLinks: [
      {
        label: 'URL State & Navigation Concept',
        url: 'https://devzwo.github.io/ngx-magic-scroll/concepts/url-state-and-navigation/',
      },
      {
        label: 'MagicScrollOptions.behavior API',
        url: 'https://devzwo.github.io/ngx-magic-scroll/api/interfaces/magicscrolloptions/#behavior',
      },
    ],
  },
  headerOffset: {
    id: 'headerOffset',
    title: 'Top Offset',
    propertyKey: 'headerOffset',
    summary:
      'Defines breathing room in pixels below sticky/fixed headers (or the top of the viewport when no header selector is specified).',
    impact:
      'Anchors align with this pixel margin below the top boundary instead of sticking flush against the edge.',
    scopes: ['provideMagicScroll', '[scrollOptions]', 'scrollTo'],
    docLinks: [
      {
        label: 'Configuring Activation Boundaries & Scroll Offsets',
        url: 'https://devzwo.github.io/ngx-magic-scroll/concepts/anchors/#configuring-activation-boundaries-and-scroll-offsets',
      },
      {
        label: 'MagicScrollOptions.headerOffset API',
        url: 'https://devzwo.github.io/ngx-magic-scroll/api/interfaces/magicscrolloptions/#headeroffset',
      },
    ],
  },
  bottomOffset: {
    id: 'bottomOffset',
    title: 'Bottom Offset',
    propertyKey: 'bottomOffset',
    summary:
      'Defines a bottom exclusion margin in pixels to adjust the active reading boundary from the bottom edge of the viewport.',
    impact:
      'Anchors located near the bottom of the viewport are excluded from being considered active until they pass above this threshold.',
    scopes: ['provideMagicScroll', '[scrollOptions]'],
    docLinks: [
      {
        label: 'Configuring Activation Boundaries & Scroll Offsets',
        url: 'https://devzwo.github.io/ngx-magic-scroll/concepts/anchors/#configuring-activation-boundaries-and-scroll-offsets',
      },
      {
        label: 'MagicScrollOptions.bottomOffset API',
        url: 'https://devzwo.github.io/ngx-magic-scroll/api/interfaces/magicscrolloptions/#bottomoffset',
      },
    ],
  },
  activationThreshold: {
    id: 'activationThreshold',
    title: 'Activation Threshold',
    propertyKey: 'activationThreshold',
    summary:
      'Relative focal line (0.0 to 1.0) defining the trigger line within the visible reading area.',
    impact:
      '0.0 activates anchors as soon as they cross the top/header offset, whereas higher values (e.g. 0.25, 0.33, or 0.5) activate anchors as they reach the upper quarter, upper third, or center of the viewport.',
    scopes: ['provideMagicScroll', '[scrollOptions]'],
    docLinks: [
      {
        label: 'Configuring Activation Boundaries & Scroll Offsets',
        url: 'https://devzwo.github.io/ngx-magic-scroll/concepts/anchors/#configuring-activation-boundaries-and-scroll-offsets',
      },
      {
        label: 'MagicScrollOptions.activationThreshold API',
        url: 'https://devzwo.github.io/ngx-magic-scroll/api/interfaces/magicscrolloptions/#activationthreshold',
      },
    ],
  },
  overlay: {
    id: 'overlay',
    title: 'Active Zone Overlay',
    summary:
      'Visual helper tool rendered in the demo to illustrate calculated active reading boundaries and activation trigger line.',
    impact:
      'Allows real-time visual inspection of how headerOffset, bottomOffset, and activationThreshold affect anchor detection.',
    scopes: ['demo'],
    docLinks: [
      {
        label: 'Configuring Activation Boundaries & Scroll Offsets',
        url: 'https://devzwo.github.io/ngx-magic-scroll/concepts/anchors/#configuring-activation-boundaries-and-scroll-offsets',
      },
    ],
  },
  ignoreWhenInView: {
    id: 'ignoreWhenInView',
    title: 'Skip Scrolling',
    propertyKey: 'ignoreWhenInView',
    summary:
      'Skips scrolling if the target anchor element is already sufficiently visible in the viewport.',
    impact:
      "Avoids disorienting scroll movement when navigating to an anchor that is already in view (options: 'none', 'top', 'full', 'always').",
    scopes: ['provideMagicScroll', '[scrollOptions]', 'scrollTo'],
    docLinks: [
      {
        label: 'MagicScrollOptions.ignoreWhenInView API',
        url: 'https://devzwo.github.io/ngx-magic-scroll/api/interfaces/magicscrolloptions/#ignorewheninview',
      },
    ],
  },
  debounceTime: {
    id: 'debounceTime',
    title: 'Scroll-spy Delay',
    propertyKey: 'debounceTime',
    summary:
      'Scroll-spy update interval in milliseconds before synchronizing the active anchor with the URL fragment.',
    impact:
      'Higher values prevent excessive URL state updates and history pollution during rapid continuous scrolling.',
    scopes: ['provideMagicScroll', '[scrollOptions]'],
    docLinks: [
      {
        label: 'Scrolling records an anchor',
        url: 'https://devzwo.github.io/ngx-magic-scroll/concepts/url-state-and-navigation/#scrolling-records-an-anchor',
      },
      {
        label: 'MagicScrollOptions.debounceTime API',
        url: 'https://devzwo.github.io/ngx-magic-scroll/api/interfaces/magicscrolloptions/#debouncetime',
      },
    ],
  },
  anchorSelection: {
    id: 'anchorSelection',
    title: 'Anchor Selection',
    propertyKey: 'anchorPrefixes / anchorSelection',
    summary: 'Rules and ID prefix filters used to discover scroll anchors within the region.',
    impact:
      'Filters out non-content element IDs (like UI widgets or form fields) from participating in scroll tracking, or restricts anchor selection strictly to explicit scrollAnchor directives.',
    scopes: ['provideMagicScroll', '[scrollOptions]'],
    docLinks: [
      {
        label: 'A Region Selects its Anchors',
        url: 'https://devzwo.github.io/ngx-magic-scroll/concepts/anchors/#a-region-selects-its-anchors',
      },
      {
        label: 'MagicScrollOptions API',
        url: 'https://devzwo.github.io/ngx-magic-scroll/api/interfaces/magicscrolloptions/',
      },
    ],
  },
  restoreOnDataChange: {
    id: 'restoreOnDataChange',
    title: 'Restore on Data Change',
    propertyKey: 'restoreOnDataChange',
    summary:
      "Preserves the active anchor's visible position when asynchronous data items are inserted or modified above it.",
    impact:
      'Eliminates disorienting jumps caused by layout shifts during pagination or reactive data reloads.',
    scopes: ['provideMagicScroll', '[scrollOptions]'],
    docLinks: [
      {
        label: 'Position Preservation Policies',
        url: 'https://devzwo.github.io/ngx-magic-scroll/concepts/position-preservation/#different-causes-have-different-policies',
      },
      {
        label: 'MagicScrollOptions.restoreOnDataChange API',
        url: 'https://devzwo.github.io/ngx-magic-scroll/api/interfaces/magicscrolloptions/#restoreondatachange',
      },
    ],
  },
  preserveOnLayoutChange: {
    id: 'preserveOnLayoutChange',
    title: 'Preserve on Layout Change',
    propertyKey: 'preserveOnLayoutChange',
    summary:
      'Preserves the active reading position when content inside the region reflows asynchronously (e.g. image loads, form expansions, accordion toggles) without changes to scrollSource.',
    impact:
      'Prevents disorienting page jumps during dynamic layout expansions while maintaining the exact pixel displacement inside the active section.',
    scopes: ['provideMagicScroll', '[scrollOptions]'],
    docLinks: [
      {
        label: 'Position Preservation Policies',
        url: 'https://devzwo.github.io/ngx-magic-scroll/concepts/position-preservation/#different-causes-have-different-policies',
      },
      {
        label: 'MagicScrollOptions.preserveOnLayoutChange API',
        url: 'https://devzwo.github.io/ngx-magic-scroll/api/interfaces/magicscrolloptions/#preserveonlayoutchange',
      },
    ],
  },
  focus: {
    id: 'focus',
    title: 'Focus Transfer',
    propertyKey: 'focus',
    summary:
      'Transfers DOM keyboard focus to the target anchor element upon deliberate programmatic navigation.',
    impact:
      'Improves accessibility by moving keyboard and screen reader focus directly to the target landmark or anchor without triggering secondary scrolling jumps.',
    scopes: ['scrollTo'],
    docLinks: [
      {
        label: 'Accessible Focus Transfer',
        url: 'https://devzwo.github.io/ngx-magic-scroll/recipes/scroll-to-anchor/#accessible-focus-transfer',
      },
      {
        label: 'MagicScrollToOptions.focus API',
        url: 'https://devzwo.github.io/ngx-magic-scroll/api/interfaces/magicscrolltooptions/#focus',
      },
    ],
  },
};
