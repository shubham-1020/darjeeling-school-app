import React from 'react'
import { useState, useEffect } from 'react';
import {auth,db} from '../setup';
import LinkStudents from './LinkStudents';

function StudentClasses() {
  return (
    <>
    <LinkStudents />
    </>
  )
}

export default StudentClasses