import React from 'react';


export function Tile({ tile, onClick }) {
  if (tile) {
    return (
      <div className="tile"
           data-tile={tile}
           title={getTitle(tile)}
           onClick={onClick} />
    );
  } else {
    return <div className="tile-placeholder" />;
  }
}

function getTitle(type) {
  let suit = type[0];
  let number = type[1];

  switch (suit) {
  case 'M':
    return number + ' Man';
  case 'P':
    return number + ' Pin';
  case 'S':
    return number + ' Sou';
  case 'X':
    return ['Ton', 'Nan', 'Xia', 'Pei', 'Haku', 'Hatsu', 'Chun'][number-1];
  }
}

export function TileList({ tiles, className, onTileClick }) {
  tiles = tiles || [];
  className = className || '';

  let tileComponents;
  if (onTileClick) {
    tileComponents = tiles.map((tile, i) => (
      <Tile tile={tile} key={i} onClick={() => onTileClick(i, tile)} />
    ));
    className += ' tiles-clickable';
  } else {
    tileComponents = tiles.map((tile, i) => (
      <Tile tile={tile} key={i} />
    ));
  }

  return <div className={className}>{tileComponents}</div>;
}
