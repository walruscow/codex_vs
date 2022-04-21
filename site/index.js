'use strict';

import * as auth from './auth.js';
import * as wcl from './wcl.js';
const codex_id = 185836;

function parse_report_url(url) {
  let result = {
    report_id: null,
    fight_id: null
  };

  try {
    url = new URL(url);
  } catch (err) {
    return result;
  }

  if (!url.pathname.startsWith('/reports/')) {
    return result;
  }

  result.report_id = url.pathname.substr('/reports/'.length);

  if (url.hash) {
    // Strip leading # from hash
    let params = new URLSearchParams(url.hash.substr(1));
    result.fight_id = params.get('fight');

    if (result.fight_id && result.fight_id != 'last') {
      result.fight_id = parseInt(result.fight_id);
    }
  }

  return result;
}

async function analyze_codex(auth_token, report_id, fight, player_data) {
  let result = {
    codex_damage: null,
    strength_trinket_damage: null
  };
  return result;
} // TODO: food for thought.. are there background JS worker things we can take
// advantage of to do this heavy lifting?
//
// TODO: We don't really want this exactly. probably we just want to show every
// player and then under them show the stats about codex (yes, this)
//
// so this function should be 2 parts.. one to actually call list_players from
// python impl. then after we fetch combatantinfo and merge it together into one
// unseemly beast
//
// then separately we'll have a stateful class constructed from that data
// that will be used to process the events
//  class Player // name, is_codex, player_id, server, etc
//  class PlayerAnalyzer // Player, combat_events -> getCodexStats
//
// to start with, the stats will be "not wearing codex"
// in the future, "simulated codex dps" will be a part of it too
//
// if wearing codex
//  Strength dps (damage) (estimated)
//  Codex dps (damage)
//  Passive trinket dps (benchmark, not actual data)
//  Verdict: WORTH / NOT WORTH
// or, if not wearing codex
//  Strength dps (damage)
//  Codex dps (damage) (estimated)
//  Trinket dps (benchmark, not actual data)
//  Verdict: WORTH / NOT WORTH
// TODO: eventually also consider
//  what if I upgraded codex?
//  did codex save life?
//  select trinket ilvl


async function analyze_player(auth_token, report_id, fight, player) {
  // TODO: the whole app
  // determine player initial state
  // query for events
  // for each event..
  //  await query_all_events
  // merge_events()
  // analyze_events()
  // construct and return summary of results
  return {};
}

async function analyze_players(auth_token, report_id, fight, players) {
  let analysis = {};

  for (var player of players) {
    // TODO: Should this actually be a web worker thing?
    analysis[player.id] = await analyze_player(auth_token, report_id, fight, player);
  }

  return analysis;
}

function PlayerList(props) {
  if (!props.players) {
    return /*#__PURE__*/React.createElement("div", {
      display: "flex"
    }, "Loading...");
  }

  return /*#__PURE__*/React.createElement("div", {
    display: "flex"
  }, props.players.map(p => /*#__PURE__*/React.createElement(PlayerCard, {
    player: p,
    analysis: props.analysis && props.analysis[p.id]
  })));
}

function PlayerAnalysis(props) {
  // no data yet means we're loading it
  if (!props.analysis) {
    return /*#__PURE__*/React.createElement("div", null, "Loading!");
  }

  return /*#__PURE__*/React.createElement("div", null, "Analysis here!");
}

function PlayerCard(props) {
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", null, props.player.name, "-", props.player.server, ": ", props.player.type), /*#__PURE__*/React.createElement(PlayerAnalysis, {
    aa: props.analysis
  }));
}

function FightItem(props) {
  const f = props.fight;

  const duration_str = function () {
    const dur_s = Math.floor((f.endTime - f.startTime) / 1000);
    const secs = (Math.floor(dur_s) % 60).toString().padStart(2, '0');
    const mins = Math.floor(dur_s / 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  }(); // 2022-04-19, 20:25


  const date_str = f.date.toLocaleString('en-CA', {
    timeStyle: 'short',
    dateStyle: 'short',
    hour12: false
  });
  const id_str = `fight_${f.id}`;
  return /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    id: id_str,
    name: "fight",
    value: f.id,
    onClick: props.clickFight,
    checked: props.selected
  }), /*#__PURE__*/React.createElement("label", {
    for: id_str
  }, f.name, " ", duration_str, " (", date_str, ")"));
}

function FightList(props) {
  return /*#__PURE__*/React.createElement("ul", null, props.fights.map(f => /*#__PURE__*/React.createElement(FightItem, {
    fight: f,
    key: f.id,
    clickFight: props.clickFight,
    selected: props.selected_fight === f.id
  })));
}

function AnalysisResults(props) {
  return /*#__PURE__*/React.createElement("div", null, "Results!");
}

class CodexApp extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      fights: null,
      report_id: null,
      fight_id: null,
      players: null,
      analysis: null
    };
  }

  render() {
    // what to do here? well, I guess we can now get the latest reports even.
    // for now, let's just render a text box I guess?
    let fights_list = null;

    if (this.state.fights) {
      fights_list = /*#__PURE__*/React.createElement(FightList, {
        fights: this.state.fights,
        clickFight: e => this.select_fight(e),
        selected_fight: this.state.fight_id
      });
    }

    let player_list = null;

    if (this.state.players) {
      player_list = /*#__PURE__*/React.createElement(PlayerList, {
        players: this.state.players,
        analysis: this.state.analysis
      });
    } else if (this.state.selected_fight) {
      player_list = /*#__PURE__*/React.createElement("div", {
        id: "loading"
      }, "Loading...");
    }

    return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
      for: "report"
    }, "Enter a report ID or paste a URL:"), /*#__PURE__*/React.createElement("input", {
      type: "text",
      id: "report",
      name: "report",
      onInput: e => this.handleReportInput(e)
    }), fights_list, player_list);
  }

  async select_fight(e) {
    let new_fight_id = parseInt(e.target.value);
    this.setState({
      fight_id: new_fight_id,
      // clear old players while new ones load
      players: null
    }); // TODO: To support "Loading..." then we could also store a var like
    // Loading<Promise<Players>>
    // and then pass that variable into PlayerList<> Component
    // then PlayerList can check if (this.props.loading_list.loaded())
    // and use this.props.loading_list.data
    // ... and have loading_list.on_load(...) to call setState(as a no-op? or with a real thing)
    // ... could have a "name" for this loader. or use object id guuid thing?

    const fight = this.state.fights.find(f => f.id == new_fight_id);
    const players = await wcl.list_players(this.props.auth_token, this.state.report_id, fight);
    this.setState(function (s) {
      if (s.fight_id == new_fight_id) {
        s.players = players;
      }

      return s;
    });
    const analysis = await analyze_players(this.props.auth_token, this.state.report_id, fight, players);
    this.setState(function (s) {
      if (s.fight_id == new_fight_id) {
        s.analysis = analysis;
      }
    });
  }

  handleReportInput(e) {
    let report_id = null;
    let fight_id = null;

    if (!e.target.value) {
      return;
    }

    if (e.target.value.includes('warcraftlogs.com')) {
      ({
        report_id,
        fight_id
      } = parse_report_url(e.target.value));
    } else {
      report_id = e.target.value;
    }

    if (!report_id) {
      // Nothing to do with no possibly-legit report id
      return;
    }

    this.setState({
      report_id: report_id
    });
    wcl.list_fights(this.props.auth_token, report_id).then(fights => this.setState({
      fights: fights,
      fight_id: fight_id == 'last' ? fights.at(-1).id : fight_id
    })).catch(err => console.log(err));
  }

}

class AppRoot extends React.Component {
  constructor(props) {
    super(props);
    const code = auth.getRedirectCodeOrNull();
    const auth_token = auth.getAuthTokenOrNull();
    this.state = {
      auth_token: auth_token,
      awaiting_token: !!code
    };

    if (code) {
      auth.getAuthToken(code).then(tok => this.setState({
        awaiting_token: false,
        auth_token: tok
      }));
    }
  }

  render() {
    if (!this.state.auth_token && !this.state.awaiting_token) {
      // the state is "needs auth"
      return /*#__PURE__*/React.createElement("button", {
        onClick: auth.redirectForAuth
      }, "Authenticate with WCL");
    } else if (this.state.awaiting_token) {
      // the state is "getting_token"
      return 'Waiting for token from WCL';
    } else {
      return /*#__PURE__*/React.createElement(CodexApp, {
        auth_token: this.state.auth_token
      });
    }
  }

}

const domContainer = document.querySelector('#root');
const root = ReactDOM.createRoot(domContainer);
root.render( /*#__PURE__*/React.createElement(AppRoot, null));