import LoadingPage from '@components/LoadingPage';
import '@style/Feedback.css';
import axios from 'axios';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';

function Feedback() {
  const [feedbackData, setFeedbackData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchFeedback = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/Feedback/Feedback.php?action=fetch', {
        headers: { Accept: 'application/json' },
      });

      if (response.data?.success) {
        setFeedbackData(response.data.data);
      } else {
        throw new Error(response.data?.error || 'Invalid response format');
      }
    } catch (err) {
      setError(err.message);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Failed to load feedback: ${err.response?.data?.error || err.message || 'An error occurred'}`,
        confirmButtonColor: '#6B4E31',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const filteredFeedback = statusFilter === 'All'
    ? feedbackData
    : feedbackData.filter(item => item.status === statusFilter);

  const handleStatusUpdate = async (contact_id, currentStatus) => {
    try {
      const { value: newStatus } = await Swal.fire({
        title: 'Update Status',
        input: 'select',
        inputOptions: {
          Pending: 'Pending',
          Reviewed: 'Reviewed',
          'In Progress': 'In Progress',
          Flagged: 'Flagged',
          Resolved: 'Resolved',
          Ignored: 'Ignored',
          Archived: 'Archived',
        },
        inputValue: currentStatus,
        showCancelButton: true,
        confirmButtonColor: '#6B4E31',
      });

      if (newStatus && newStatus !== currentStatus) {
        const response = await axios.patch(
          '/api/Feedback/Feedback.php?action=update',
          { contact_id, status: newStatus },
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (response.data.success) {
          setFeedbackData((prev) =>
            prev.map((item) =>
              item.contact_id === contact_id ? { ...item, status: newStatus } : item
            )
          );
          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: 'Status updated successfully',
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          throw new Error(response.data.error || 'Failed to update status');
        }
      } else if (newStatus === currentStatus) {
        Swal.fire({
          icon: 'info',
          title: 'No Change',
          text: `The status is already set to ${newStatus}`,
          timer: 2000,
          showConfirmButton: false,
        });
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.error || err.message || 'Failed to update status',
        confirmButtonColor: '#6B4E31',
      });
    }
  };

  const handleDeleteFeedback = async (contact_id) => {
    try {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#6B4E31',
        cancelButtonColor: '#A0522D',
        confirmButtonText: 'Yes, delete it!',
      });

      if (result.isConfirmed) {
        const response = await axios.delete('/api/Feedback/Feedback.php?action=delete', {
          data: { contact_id },
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.data.success) {
          setFeedbackData((prev) => prev.filter((item) => item.contact_id !== contact_id));
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Feedback has been deleted.',
            timer: 2000,
            showConfirmButton: false,
          });
        } else {
          throw new Error(response.data.error || 'Failed to delete feedback');
        }
      }
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.error || err.message || 'Failed to delete feedback',
        confirmButtonColor: '#6B4E31',
      });
    }
  };

  if (isLoading) return <LoadingPage />;

  if (error) {
    return (
      <div className="feedback-container">
        <div className="feedback-error">
          <span>{ error }</span>
          <button className="feedback-btn-retry" onClick={ fetchFeedback }>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="feedback-container">
      <h1 className="feedback-title">Coffee House Feedback</h1>
      <div className="feedback-controls">
        <button onClick={ fetchFeedback } className="feedback-btn-refresh">
          Refresh Feedback
        </button>
        <div className="feedback-filter">
          <label htmlFor="statusFilter" className="feedback-filter-label">Filter by Status:</label>
          <select
            id="statusFilter"
            value={ statusFilter }
            onChange={ (e) => setStatusFilter(e.target.value) }
            className="feedback-filter-select"
          >
            <option value="All">All</option>
            <option value="Pending">Pending</option>
            <option value="Reviewed">Reviewed</option>
            <option value="In Progress">In Progress</option>
            <option value="Flagged">Flagged</option>
            <option value="Resolved">Resolved</option>
            <option value="Ignored">Ignored</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>
      { filteredFeedback.length === 0 ? (
        <div className="feedback-no-results">
          <p>No feedback yet. Enjoy the calm before the brew!</p>
        </div>
      ) : (
        <div className="feedback-table-container">
          <table className="feedback-table">
            <thead>
              <tr>
                <th scope="col">ID</th>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Message</th>
                <th scope="col">Status</th>
                <th scope="col">Date</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              { filteredFeedback.map((feedback) => (
                <tr key={ feedback.contact_id }>
                  <td>{ feedback.contact_id }</td>
                  <td>{ feedback.name }</td>
                  <td>{ feedback.email }</td>
                  <td className="feedback-message">
                    <div className="feedback-message-text" title={ feedback.message }>
                      { feedback.message }
                    </div>
                  </td>
                  <td>
                    <span className={ `feedback-status-badge feedback-status-${feedback.status.toLowerCase().replace(' ', '-')}` }>
                      { feedback.status }
                    </span>
                  </td>
                  <td>{ new Date(feedback.created_at).toLocaleDateString() }</td>
                  <td className="feedback-actions">
                    <button
                      onClick={ () => handleStatusUpdate(feedback.contact_id, feedback.status) }
                      className="feedback-btn-update"
                    >
                      Update
                    </button>
                    <button
                      onClick={ () => handleDeleteFeedback(feedback.contact_id) }
                      className="feedback-btn-delete"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )) }
            </tbody>
          </table>
        </div>
      ) }
    </div>
  );
}

export default Feedback;
