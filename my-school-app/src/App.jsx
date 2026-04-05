import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import EmailForm from './Auth/EmailForm';
import ParentDashboard from './dashboard/ParentDashboard';
import TeacherDashboard from './dashboard/TeacherDashboard';
import Header from './Header';
import Footer from './Footer';
// import AddHomework from './homework/AddHomework';
import AdminDashboard from './dashboard/AdminDashboard';
import ManageTeachers from './admin/ManageTeachers';
import ManageClasses from './admin/ManageClasses';
import MyChild from './parentSection/MyChild';

import Layout from './components/Layout';

function App() {
  return (
    <Router>
      <Layout>
        <Header />
        <main className="container mx-auto px-6 py-12 min-h-[calc(100vh-200px)]">
          <Routes>
            <Route path="/login" element={<EmailForm />} />
            <Route path="/parent-dashboard" element={<ParentDashboard />} />
            <Route path='/admin-dashboard' element={<AdminDashboard />} />
            <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
            <Route path="/" element={<EmailForm/>} />
            <Route path='/admin-dashboard/manage-teachers' element={<ManageTeachers />} />
            <Route path='/admin-dashboard/manage-classes' element={<ManageClasses />} />
            <Route path='/my-child/:studentId' element= {<MyChild/>} />
          </Routes>
        </main>
        <Footer/>
      </Layout>
    </Router>
  );
}


export default App;
