import React from 'react';
import { FaBars } from 'react-icons/fa';
import './MobileMenuButton.css';

const MobileMenuButton = ({ onClick }) => {
  return (
    <button className="mobile-menu-button" onClick={onClick}>
      <FaBars />
    </button>
  );
};

export default MobileMenuButton;

