/**
 * PIC Calendar
 * Author: Taigo Ito (https://qwel.design/)
 * Location: Fukui, Japan
 */

import Calendar from './_calendar.js';

// データベース上'0'は担当者未定
// よって、PICList[index - 1]にて担当者を表示
const PICList = [
  '岩城',
  '長谷川',
  '林',
  '出見',
  '高橋',
  '西村',
  '前田',
  '伊藤',
  '近村',
  '谷口'
]

export default class PICCalendar extends Calendar {
  async makeCalendar(year, month) {
    super.makeCalendar(year, month);

    // データを取得して、状態値を反映
    const url = this.options.url;
    const res = await fetch(`${url}php/api.php?method=fetch&year=${year}&month=${month + 1}`);
    let data = await res.json();

    // 重複を除外 (最後のデータを残す)
    const lastIndexMap = {}
    data.forEach((dt, i) => {
      lastIndexMap[dt.date] = i;
    });
    data = data.filter((dt, i) => {
      return lastIndexMap[dt.date] == i;
    });

    //console.log(data);
    this._setStatus(data);
  }

  _handleEvents() {
    super._handleEvents();

    // モードの選択受付
    const mode = document.querySelector('.calendar__mode');
    if (!mode) return;
    mode.addEventListener('change', () => {
      if (mode.querySelector('input').value === 'gksp') {
        this._elem.classList.add('--editMode');
      } else {
        this._elem.classList.remove('--editMode');
      }
    });

    // セルのデータ操作受付
    this._body.addEventListener('click', (event) => {
      this._cellClickHandler(event);
      this._setPIC(false);
    });
  }

  // セルのデータ:
  // data-date: 日付文字列
  // data-week: 0:日曜, 1:月曜, ..., 6:土曜
  // data-state: 予定の有無
  // data-pic: 担当者
  // data-is-saved: 保存の有無
  _setStatus(data) {
    const elems = this._body.querySelectorAll('[data-date]');
    elems.forEach((td) => {
      const date = td.dataset.date;
      const week = td.dataset.week;

      // 週のデフォルト値
      // 水・金が1, それ以外は0
      let state = (week == 3 || week == 5) ? 1 : 0;

      // データがあれば、状態値を上書き
      data.forEach((dt) => {
        if (dt.date == date) {
          state = dt.state;
          // 担当者を記名
          if (dt.pic > 0) {
            this._writePIC(td, dt.pic - 0, true); // データベースから取り出した値は、明示的に数値型へパース
          }
        }
      });
      td.dataset.state = state;

      // data-picが未指定の場合 '0' を指定
      if (!td.dataset.pic) td.dataset.pic = 0;

      // data-is-savedが未指定の場合 'false' を指定
      if (!td.dataset.isSaved) td.dataset.isSaved = false;
    });

    // データの初期化
    this.data = data;
    this._initPIC();
  }

  // セルへの書き込み ("data-pic"と.calendar__valueの記名)
  // is-savedにて、保存済みデータか否かを分ける
  _writePIC(target, pic, isSaved = false) {
    target.dataset.pic = pic;
    target.dataset.isSaved = isSaved;
    const value = target.querySelector('.calendar__value');
    value.textContent = PICList[pic - 1];
  }

  // データの初期化
  _initPIC() {
    this._getData();
    this._setPIC(true);
    this._saveData();
  }

  // 最終保存日と最終担当者を取得
  _getData() {
    this.latestDate = new Date('2025-03-01');
    this.latestPIC = 1; // 実際の上記日付の次回担当者
    this.data.forEach((dt) => {
      if (dt.pic > 0 && this.latestDate < new Date(dt.date)) {
        this.latestDate = new Date(dt.date);
        this.latestPIC = dt.pic - 0; // データベースから取り出した値は、明示的に数値型へパース
      }
    });
  }

  // 最終保存日と最終担当者を保存
  _saveData() {
    const eventDate = document.querySelectorAll('[data-state="1"][data-is-saved="false"]');
    eventDate.forEach((ed) => {
      const date = new Date(ed.dataset.date);
      if (date < this.today) {
        // データの更新をPUT
        const url = this.options.url;
        const date = ed.dataset.date;
        const state = ed.dataset.state;
        const pic = ed.dataset.pic;

        if (date) {
          const postData = new FormData;
          postData.set('date', date);
          postData.set('state', state);
          postData.set('pic', pic);

          fetch(`${url}php/api.php?method=insert`, {
            method: 'POST',
            body: postData
          });
        }
      }
    });
  }

  // 担当者未割当の月間予定に、担当者を順次割り当てていく
  // 引数initialized: 初回の処理はture, それ以外はfalse
  _setPIC(initialized = false) {
    const startPIC = this._getStartPIC();
    const len = PICList.length;
    const eventDate = initialized ? document.querySelectorAll('[data-state="1"][data-pic="0"]') :
      document.querySelectorAll('[data-state="1"][data-is-saved="false"]');
    eventDate.forEach((ed, i) => {
      const pic = (startPIC + i - 1) % len + 1;
      this._writePIC(ed, pic, false);
    });
  }

  _getStartPIC() {
    let pic = this.latestPIC;
    const len = PICList.length;
    const diff = (this.latestDate.getFullYear() < this.year) ? 12 : 0; 
    const latestMonth = this.latestDate.getMonth();
    const baseMonth = this.month + diff;

    if (latestMonth < baseMonth) {
      // 最終保存日が先月以前
      for (let i = latestMonth; i < baseMonth; i++) {
        pic += this._countEventDateInMonth(this.year, i);
      }
    } else if (latestMonth > baseMonth) {
      // 最終保存日が翌月以降 (過去を参照している)
      // 暫定対応 (月内の担当者が1名も保存去れていない場合にエラー)
      const eventDate = document.querySelectorAll('[data-state="1"][data-is-saved="true"]');
      if (eventDate && eventDate > 0) {
        eventDate.forEach((ed) => {
          pic = ed.dataset.pic - 0;
        });
      }
    }
    return pic % len + 1; // 最終担当者の次担当者から開始
  }

  _countEventDateInMonth(year, month) {
    // 担当者未割当の月間予定をカウント
    let date = new Date(year, month, 1);
    let count = 0;
    while (date.getMonth() === month) {
      const day = date.getDay();
      if (day === 3 || day === 5) {
        // state == 0 の場合はカウントを除外
        const dateStr = this._parseDate(date.getFullYear(), date.getMonth(), date.getDate());
        this.data.forEach((dt) => {
          if (dateStr == dt.date && dt.state == 0) {
            count--;
          }
          if (dateStr == dt.date && dt.state == 1 && dt.pic > 0) {
            count--;
          }
        });
        count++;
      }
      date.setDate(date.getDate() + 1); // 翌日に進める
    }
    return count;
  }
  
  _cellClickHandler(event) {
    // 編集モード時のみ受付
    if (!(this._elem.classList.contains('--editMode'))) return;

    // 過去の日付は編集不可
    const target = event.target;
    const date = target.dataset.date;
    if (new Date(date) < this.today) return;

    // 状態値を更新
    let state = target.dataset.state - 0;
    state = (state + 1) % 2; // 2択
    target.dataset.state = state;

    // 予定をOFFにする場合は、担当者も'0'を指定し、記名を削除しておく
    if (state == 0) {
      target.dataset.pic = 0;
      const span = target.querySelector('.calendar__value');
      span.textContent = '';
    }

    // データの更新をPUT
    const url = this.options.url;

    if (date) {
      const postData = new FormData;
      postData.set('date', date);
      postData.set('state', state);
      postData.set('pic', 0); // 予定は0を指定

      fetch(`${url}php/api.php?method=insert`, {
        method: 'POST',
        body: postData
      });
    }
  }
}
