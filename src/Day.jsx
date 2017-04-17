import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { HOUR_IN_PIXELS } from './Constants';
import TimeSlot from './TimeSlot';
import hours from './hours';
import positionInDay from './positionInDay';
import styles from './Day.css';
import toDate from './toDate';

const ROUND_TO_NEAREST_MINS = 5;

function relativeY(e) {
  const { offsetTop, scrollTop } = e.target.parentNode.parentNode;
  const realY = e.pageY - offsetTop + scrollTop;
  const snapTo = ROUND_TO_NEAREST_MINS / 60 * HOUR_IN_PIXELS;
  return Math.floor(realY / snapTo) * snapTo;
}

export default class Day extends Component {
  constructor() {
    super();
    this.state = {
      index: null,
      selections: [],
    };
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
  }

  findSelectionAt(date) {
    for (let i = 0; i < this.state.selections.length; i++) {
      const selection = this.state.selections[i];
      if (Math.abs(selection.end.getTime() - date.getTime()) <= 300000) {
        // Close enough to drag the trailing edge
        return { edge: 'end', index: i };
      }
      if (
        selection.start.getTime() <= date.getTime() &&
        selection.end.getTime() >= date.getTime()
      ) {
        return { edge: 'both', index: i };
      }
    }
    return {};
  }

  hasOverlap(start, end, ignoreIndex) {
    for (let i = 0; i < this.state.selections.length; i++) {
      if (i === ignoreIndex) {
        continue;
      }
      const selection = this.state.selections[i];
      if (selection.start > start && selection.start < end) {
        // overlapping start
        return true;
      }
      if (selection.end > start && selection.end < end) {
        // overlapping end
        return true;
      }
      if (selection.start <= start && selection.end >= end) {
        // inside
        return true;
      }
    }
    return false;
  }

  handleMouseDown(e) {
    const position = relativeY(e);
    const dateAtPosition = toDate(this.props.date, position);
    const { edge, index } = this.findSelectionAt(dateAtPosition);
    if (edge) {
      // We found an existing one at this position
      this.setState({
        edge,
        index,
        lastKnownPosition: position,
      });
      return;
    }

    this.setState(({ selections }) => {
      return {
        edge: 'end',
        index: selections.length,
        lastKnownPosition: position,
        selections: selections.concat([{
          start: dateAtPosition,
          end: toDate(this.props.date, position + HOUR_IN_PIXELS / 2),
        }]),
      };
    });
  }

  handleMouseMove(e) {
    if (this.state.index === null) {
      return;
    }
    const position = relativeY(e);
    this.setState(({ selections, edge, index, lastKnownPosition }) => {
      const selection = selections[index];
      if (edge === 'both') {
        // move element
        const diff = toDate(this.props.date, position).getTime() -
          toDate(this.props.date, lastKnownPosition).getTime();
        const newStart = new Date(selection.start.getTime() + diff);
        const newEnd = new Date(selection.end.getTime() + diff);
        if (this.hasOverlap(newStart, newEnd, index)) {
          return {};
        }
        selection.start = newStart;
        selection.end = newEnd;
      } else {
        // stretch element
        const newEnd = toDate(this.props.date,
          Math.max(positionInDay(selection.start) + HOUR_IN_PIXELS / 2, position));
        if (this.hasOverlap(selection.start, newEnd, index)) {
          // Collision! Let
          return {};
        }
        selection.end = newEnd;
      }
      return {
        lastKnownPosition: position,
        selections,
      };
    })
  }

  handleMouseUp(e) {
    this.setState({
      edge: null,
      index: null,
      lastKnownPosition: null,
    });
  }

  render() {
    const {
      selections,
    } = this.state;

    return (
      <div className={styles.component}>
        {hours.map((hour) => (
          <div
            key={hour}
            className={styles.hour}
            style={{ height: HOUR_IN_PIXELS }}
          >
            <div className={styles.halfHour}/>
          </div>
        ))}
        {selections.map(({ start, end }, i) => (
          <TimeSlot
            key={i}
            start={start}
            end={end}
          />
        ))}
        <div
          onMouseDown={this.handleMouseDown}
          onMouseUp={this.handleMouseUp}
          onMouseMove={this.handleMouseMove}
          onMouseOut={this.handleMouseUp}
          className={styles.mouseTarget}
        />
      </div>
    );
  }
}

Day.propTypes = {
  date: PropTypes.instanceOf(Date).isRequired,
};
