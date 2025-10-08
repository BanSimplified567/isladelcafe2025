import LoadingPage from '@components/LoadingPage';
import { ErrorOutline as ErrorIcon } from '@mui/icons-material';
import useAuthStore from '@store/authStore';
import '@style/Dashboard.css';
import axios from 'axios';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import isoWeek from 'dayjs/plugin/isoWeek';
import { ArrowDown, ArrowRight, ArrowUp, Box, Clock, Inbox, List, PieChart as PieChartIcon, ShoppingBag, Star, TrendingUp, Trophy, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import Swal from 'sweetalert2';

// Extend dayjs with required plugins
dayjs.extend(isoWeek);
dayjs.extend(customParseFormat);

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    systemStatus: {
      totalSales: 0,
      averageOrderValue: 0,
      totalOrders: 0,
      totalCustomers: 0,
      monthlyGrowth: 0,
      dailyAverageOrders: 0,
      totalProducts: 0,
      totalEmployees: 0,
      totalUsers: 0,
    },
    salesData: [],
    bestSellingProducts: [],
    topReviewedProducts: [],
    categorySales: [],
    timeOfDaySales: [],
    recentOrders: [],
  });
  const [salesFilter, setSalesFilter] = useState('monthly');

  const navigate = useNavigate();
  const { userData, checkAuthStatus, logoutAdmin } = useAuthStore();
  const userRole = userData?.role;

  // Helper to get date range for filter
  const getDateRange = (filter) => {
    const now = dayjs();
    switch (filter) {
      case 'daily':
        return {
          startDate: now.subtract(7, 'day').startOf('day').format('YYYY-MM-DD'),
          endDate: now.endOf('day').format('YYYY-MM-DD'),
        };
      case 'weekly':
        return {
          startDate: now.subtract(12, 'week').startOf('isoWeek').format('YYYY-MM-DD'),
          endDate: now.endOf('isoWeek').format('YYYY-MM-DD'),
        };
      case 'monthly':
        return {
          startDate: now.subtract(12, 'month').startOf('month').format('YYYY-MM-DD'),
          endDate: now.endOf('month').format('YYYY-MM-DD'),
        };
      case 'yearly':
        return {
          startDate: now.subtract(5, 'year').startOf('year').format('YYYY-MM-DD'),
          endDate: now.endOf('year').format('YYYY-MM-DD'),
        };
      default:
        return {
          startDate: now.subtract(30, 'day').startOf('day').format('YYYY-MM-DD'),
          endDate: now.endOf('day').format('YYYY-MM-DD'),
        };
    }
  };

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const isValidAuth = await checkAuthStatus('admin');

        if (!isValidAuth) {
          Swal.fire({
            icon: 'error',
            title: 'Unauthorized',
            text: 'Please log in to access the dashboard.',
            background: '#f5f0eb',
            color: '#5e503f',
          }).then(() => {
            navigate('/loginadmin');
          });
          return;
        }

        await fetchDashboardData(salesFilter);
      } catch (err) {
        setError('Failed to verify authentication', err);
      } finally {
        setLoading(false);
      }
    };

    verifyAuth();
    // eslint-disable-next-line
  }, [checkAuthStatus, navigate]);

  // Refetch when filter changes
  useEffect(() => {
    fetchDashboardData(salesFilter);
    // eslint-disable-next-line
  }, [salesFilter]);

  const fetchDashboardData = async (filter = salesFilter) => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('tokenadmin');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const { startDate, endDate } = getDateRange(filter);
      let url = `/api/Dashboard/Dashboard.php?action=fetch&reportType=${filter}`;
      if (startDate && endDate) {
        url += `&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
      }

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        validateStatus: (status) => status >= 200 && status < 500,
      });

      if (!response.data) {
        throw new Error('NOT FOUND ANY DATA TO DISPLAY');
      }

      if (response.data.success) {
        const data = response.data.data;

        const processDataItem = (item, numericFields) => {
          return {
            ...item,
            ...numericFields.reduce((acc, field) => {
              let value = item[field];
              if (typeof value === 'string') value = parseFloat(value);
              if (typeof value !== 'number' || isNaN(value)) value = 0;
              acc[field] = value;
              return acc;
            }, {}),
          };
        };

        if (data.salesData) {
          data.salesData = data.salesData.map((item) => {
            const processed = processDataItem(item, ['sales', 'orders']);
            let label;
            // Existing logic for other filters
            const date = dayjs(item.period);
            const dateFromFormat1 = dayjs(item.period, 'YYYY-MM-DD');
            const dateFromFormat2 = dayjs(item.period, 'YYYY-MM-DD HH:mm:ss');
            const validDate = [date, dateFromFormat1, dateFromFormat2].find(d => d.isValid()) || date;

            // Handle weekly format (YYYY-WWW)
            if (filter === 'weekly') {
              const weekMatch = item.period.match(/^(\d{4})-W(\d{2})$/);
              if (weekMatch) {
                const year = parseInt(weekMatch[1], 10);
                const week = parseInt(weekMatch[2], 10);
                // Create a date from the year and week number
                const date = dayjs().year(year).isoWeek(week).startOf('isoWeek');
                label = date.isValid() ? `Week ${week} (${date.format('MMM YYYY')})` : 'Invalid Date';
              } else {
                label = 'Invalid Date';
              }
            } else {


              if (filter === 'daily') {
                label = validDate.isValid() ? validDate.format('MMM D') : 'Invalid Date';
              } else if (filter === 'monthly') {
                label = validDate.isValid() ? validDate.format('MMM YYYY') : 'Invalid Date';
              } else if (filter === 'yearly') {
                label = validDate.isValid() ? validDate.format('YYYY') : 'Invalid Date';
              }
            }

            return {
              ...processed,
              name: label,
              label,
              originalDate: item.period,
              parsedDate: label !== 'Invalid Date' ? (filter === 'weekly' ? item.period : validDate.format('YYYY-MM-DD HH:mm:ss')) : 'Invalid'
            };
          });
        }
        if (data.topReviewedProducts) {
          data.topReviewedProducts = data.topReviewedProducts.map((item) =>
            processDataItem(item, ['reviews'])
          );
        }

        if (data.categorySales) {
          data.categorySales = data.categorySales.map((item) =>
            processDataItem(item, ['sales', 'orders'])
          );
        }

        if (data.timeOfDaySales) {
          data.timeOfDaySales = data.timeOfDaySales.map((item) => ({
            ...processDataItem(item, ['sales', 'orders']),
            hour: `${item.hour}:00`,
            name: 'Data',
          }));
        }

        setDashboardData(data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch dashboard data');
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message || error.message || 'Failed to load dashboard data';
      setError(errorMessage);

      if (error.response?.status === 401 || error.message === 'No authentication token found') {
        Swal.fire({
          icon: 'error',
          title: 'Session Expired',
          text: 'Your session has expired. Please log in again.',
          background: '#f5f0eb',
          color: '#5e503f',
        }).then(() => {
          logoutAdmin();
          navigate('/loginadmin');
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage,
          background: '#f5f0eb',
          color: '#5e503f',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(isNaN(num) ? 0 : num);
  };

  const formatNumber = (value) => {
    const num = typeof value === 'string' ? parseInt(value) : value;
    return new Intl.NumberFormat('en-PH').format(isNaN(num) ? 0 : num);
  };

  const renderStatusBadge = (status) => {
    const statusClasses = {
      Pending: 'dashboard-badge-pending',
      Processing: 'dashboard-badge-processing',
      Completed: 'dashboard-badge-completed',
      Cancelled: 'dashboard-badge-cancelled',
    };

    return (
      <span className={ `dashboard-badge ${statusClasses[status] || 'dashboard-badge-default'}` }>
        { status }
      </span>
    );
  };

  const COFFEE_COLORS = ['#6F4E37', '#C4A484', '#A67B5B', '#8B5A2B', '#D2B48C', '#E6C7A1', '#5E403F'];

  if (loading) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <div className="dashboard-error-container">
        <div className="dashboard-error-card">
          <div className="dashboard-error-icon">
            <ErrorIcon className="dashboard-error-icon-inner" />
          </div>
          <h2 className="dashboard-error-title">Error Loading Dashboard</h2>
          <p className="dashboard-error-message">{ error }</p>
          <button
            onClick={ () => fetchDashboardData(salesFilter) }
            className="dashboard-error-button"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */ }
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-header-text">
            <h1 className="dashboard-title">Coffee Dashboard</h1>
            <p className="dashboard-subtitle">
              Welcome back, { userData?.name || userRole || 'Barista' }! Here's your morning brew of insights.
            </p>
          </div>
          <div className="dashboard-user-profile">
            <div className="dashboard-user-avatar">
              <span className="dashboard-user-initial">
                { userData?.name?.trim()?.charAt(0).toUpperCase() || 'B' }
              </span>
            </div>
            <div className="dashboard-user-info">
              <div className="dashboard-user-name">{ userData?.username || 'Admin User' }</div>
              <small className="dashboard-user-role">{ userData?.role }</small>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */ }
      <div className="dashboard-stats-grid">
        { ['admin', 'manager'].includes(userRole) && (
          <div className="dashboard-stat-card dashboard-stat-card-amber">
            <div className="dashboard-stat-card-content">
              <div>
                <p className="dashboard-stat-label">Total Sales</p>
                <h3 className="dashboard-stat-value">{ formatCurrency(dashboardData.systemStatus.totalSales) }</h3>
                <span className="dashboard-stat-sublabel">
                  Avg. Order: <b>{ formatCurrency(dashboardData.systemStatus.averageOrderValue) }</b>
                </span>
              </div>
              <div className="dashboard-stat-icon-container dashboard-stat-icon-amber">
                <TrendingUp className="dashboard-stat-icon" />
              </div>
            </div>
            <div className="dashboard-stat-trend">
              <span className={ dashboardData.systemStatus.monthlyGrowth >= 0 ? 'dashboard-stat-trend-up' : 'dashboard-stat-trend-down' }>
                { dashboardData.systemStatus.monthlyGrowth >= 0 ? <ArrowUp size={ 16 } /> : <ArrowDown size={ 16 } /> }
              </span>
              <span
                className={ `dashboard-stat-trend-text ${dashboardData.systemStatus.monthlyGrowth >= 0 ? 'dashboard-stat-trend-text-up' : 'dashboard-stat-trend-text-down'}` }
              >
                { dashboardData.systemStatus.monthlyGrowth >= 0 ? '+' : '' }
                { dashboardData.systemStatus.monthlyGrowth }% from last period
              </span>
            </div>
          </div>
        ) }

        <Link to="/orders" className="dashboard-stat-card-link">
          <div className="dashboard-stat-card dashboard-stat-card-blue">
            <div className="dashboard-stat-card-content">
              <div>
                <p className="dashboard-stat-label">Total Orders</p>
                <h3 className="dashboard-stat-value">{ formatNumber(dashboardData.systemStatus.totalOrders) }</h3>
                <span className="dashboard-stat-sublabel">
                  Daily Avg: <b>{ dashboardData.systemStatus.dailyAverageOrders }</b>
                </span>
              </div>
              <div className="dashboard-stat-icon-container dashboard-stat-icon-blue">
                <ShoppingBag className="dashboard-stat-icon" />
              </div>
            </div>
          </div>
        </Link>

        { ['admin', 'manager'].includes(userRole) && (
          <Link to="/products" className="dashboard-stat-card-link">
            <div className="dashboard-stat-card dashboard-stat-card-emerald">
              <div className="dashboard-stat-card-content">
                <div>
                  <p className="dashboard-stat-label">Total Products</p>
                  <h3 className="dashboard-stat-value">{ formatNumber(dashboardData.systemStatus.totalProducts) }</h3>
                  <span className="dashboard-stat-sublabel">
                    Employees: <b>{ dashboardData.systemStatus.totalEmployees }</b>
                  </span>
                </div>
                <div className="dashboard-stat-icon-container dashboard-stat-icon-emerald">
                  <Box className="dashboard-stat-icon" />
                </div>
              </div>
            </div>
          </Link>
        ) }

        { ['admin', 'manager'].includes(userRole) && (
          <Link to="/users" className="dashboard-stat-card-link">
            <div className="dashboard-stat-card dashboard-stat-card-purple">
              <div className="dashboard-stat-card-content">
                <div>
                  <p className="dashboard-stat-label">Total Customers</p>
                  <h3 className="dashboard-stat-value">{ formatNumber(dashboardData.systemStatus.totalUsers) }</h3>
                  <span className="dashboard-stat-sublabel">All Registered Users</span>
                </div>
                <div className="dashboard-stat-icon-container dashboard-stat-icon-purple">
                  <Users className="dashboard-stat-icon" />
                </div>
              </div>
            </div>
          </Link>
        ) }
      </div>

      {/* Main Chart */ }
      <div className="dashboard-chart-section">
        <div className="dashboard-main-chart-card">
          <div className="dashboard-chart-header">
            <h5 className="dashboard-chart-title">
              <TrendingUp className="dashboard-chart-title-icon" /> Sales Trend
            </h5>
            <div className="dashboard-filter-buttons">
              { ['daily', 'weekly', 'monthly', 'yearly'].map((filter) => (
                <button
                  key={ filter }
                  className={ `dashboard-filter-btn${salesFilter === filter ? ' active' : ''}` }
                  onClick={ () => setSalesFilter(filter) }
                >
                  { filter.charAt(0).toUpperCase() + filter.slice(1) }
                </button>
              )) }
            </div>
          </div>
          <div className="dashboard-chart-body">
            <div className="dashboard-chart-container">
              { dashboardData.salesData?.length > 0 ? (
                <ResponsiveContainer width="100%" height={ 400 }>
                  <LineChart
                    data={ dashboardData.salesData }
                    margin={ { top: 20, right: 30, bottom: 50, left: 50 } }
                  >
                    <CartesianGrid strokeDasharray="3 3" className="dashboard-chart-grid" />
                    <XAxis
                      dataKey="name"
                      className="dashboard-chart-axis"
                      tick={ { fontSize: 12 } }
                      angle={ -45 }
                      textAnchor="end"
                      height={ 60 }
                      interval={ 0 }
                    />
                    <YAxis
                      yAxisId="left"
                      className="dashboard-chart-axis"
                      tickFormatter={ (value) => formatCurrency(value).replace('₱', '') }
                      tick={ { fontSize: 12 } }
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      className="dashboard-chart-axis"
                      tick={ { fontSize: 12 } }
                      label={ { value: 'Orders', angle: 90, position: 'insideRight' } }
                    />
                    <Tooltip
                      contentStyle={ {
                        backgroundColor: '#FFF9F2',
                        border: '1px solid #E6C7A1',
                        borderRadius: '8px',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                        fontSize: '0.9rem',
                        color: '#5E403F',
                      } }
                      labelFormatter={ (label) => `Period: ${label}` }
                      formatter={ (value, name) => [
                        name === 'sales' ? formatCurrency(value) : formatNumber(value),
                        name === 'sales' ? 'Sales' : 'Orders'
                      ] }
                    />
                    <Legend wrapperStyle={ { paddingTop: '20px', fontSize: '0.9rem', color: '#4B2E1A' } } />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="sales"
                      stroke="#A67B60"
                      strokeWidth={ 2 }
                      name="Sales"
                      dot={ { r: 4 } }
                      connectNulls
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="orders"
                      stroke="#6F4E37"
                      strokeWidth={ 2 }
                      name="Orders"
                      dot={ { r: 4 } }
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="dashboard-chart-empty">
                  <div className="dashboard-chart-empty-content">
                    <TrendingUp className="dashboard-chart-empty-icon" />
                    <p className="dashboard-chart-empty-text">No sales data available</p>
                  </div>
                </div>
              ) }
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */ }
      <div className="dashboard-charts-grid">
        <div className="dashboard-chart-card dashboard-chart-card-brown">
          <div className="dashboard-chart-card-header">
            <h5 className="dashboard-chart-card-title">
              <PieChartIcon className="dashboard-chart-card-icon" />
              Category Sales
            </h5>
          </div>
          <div className="dashboard-chart-card-body">
            <div className="dashboard-chart-container">
              { dashboardData.categorySales?.length > 0 ? (
                <ResponsiveContainer width="100%" height={ 300 }>
                  <BarChart
                    data={ dashboardData.categorySales }
                    margin={ { top: 10, right: 20, bottom: 30, left: 20 } }
                  >
                    <CartesianGrid strokeDasharray="3 3" className="dashboard-chart-grid" />
                    <XAxis
                      dataKey="name"
                      className="dashboard-chart-axis"
                      tick={ { fontSize: 12 } }
                      angle={ -45 }
                      textAnchor="end"
                      height={ 60 }
                    />
                    <YAxis
                      yAxisId="left"
                      className="dashboard-chart-axis"
                      tickFormatter={ formatNumber }
                      tick={ { fontSize: 12 } }
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      className="dashboard-chart-axis"
                      tickFormatter={ formatNumber }
                      tick={ { fontSize: 12 } }
                    />
                    <Tooltip
                      contentStyle={ {
                        backgroundColor: '#FFF9F2',
                        border: '1px solid #E6C7A1',
                        borderRadius: '8px',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                        fontSize: '0.9rem',
                        color: '#5E403F',
                      } }
                      formatter={ (value, name) => [
                        name === 'sales' ? formatCurrency(value) : value,
                        `Data: ${name === 'sales' ? 'Sales' : 'Orders'}`,
                      ] }
                    />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="sales"
                      fill="#A67B60"
                      radius={ [4, 4, 0, 0] }
                      name="Sales"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="orders"
                      fill="#2ec4b6"
                      radius={ [4, 4, 0, 0] }
                      name="Orders"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="dashboard-chart-empty">
                  <div className="dashboard-chart-empty-content">
                    <PieChartIcon className="dashboard-chart-empty-icon" />
                    <p className="dashboard-chart-empty-text">No category sales data</p>
                  </div>
                </div>
              ) }
            </div>
          </div>
        </div>

        <div className="dashboard-chart-card dashboard-chart-card-darkbrown">
          <div className="dashboard-chart-card-header">
            <h5 className="dashboard-chart-card-title">
              <Trophy className="dashboard-chart-card-icon" />
              Top Products
            </h5>
          </div>
          <div className="dashboard-chart-card-body">
            <div className="dashboard-chart-container">
              { dashboardData.bestSellingProducts?.length > 0 ? (
                <ResponsiveContainer width="100%" height={ 300 }>
                  <BarChart
                    data={ dashboardData.bestSellingProducts }
                    margin={ { top: 10, right: 20, bottom: 30, left: 20 } }
                  >
                    <CartesianGrid strokeDasharray="3 3" className="dashboard-chart-grid" />
                    <XAxis
                      dataKey="name"
                      className="dashboard-chart-axis"
                      tick={ { fontSize: 12 } }
                      angle={ -45 }
                      textAnchor="end"
                      height={ 60 }
                    />
                    <YAxis
                      yAxisId="left"
                      className="dashboard-chart-axis"
                      tickFormatter={ formatNumber }
                      tick={ { fontSize: 12 } }
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      className="dashboard-chart-axis"
                      tickFormatter={ formatNumber }
                      tick={ { fontSize: 12 } }
                    />
                    <Tooltip
                      contentStyle={ {
                        backgroundColor: '#FFF9F2',
                        border: '1px solid #E6C7A1',
                        borderRadius: '8px',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                        fontSize: '0.9rem',
                        color: '#5E403F',
                      } }
                      formatter={ (value, name) => [
                        name === 'sales' ? formatCurrency(value) : value,
                        `Data: ${name === 'sales' ? 'Sales' : 'Units Sold'}`,
                      ] }
                    />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="sales"
                      fill="#A67B60"
                      radius={ [4, 4, 0, 0] }
                      name="Sales"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="quantity"
                      fill="#2ec4b6"
                      radius={ [4, 4, 0, 0] }
                      name="Units Sold"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="dashboard-chart-empty">
                  <div className="dashboard-chart-empty-content">
                    <Trophy className="dashboard-chart-empty-icon" />
                    <p className="dashboard-chart-empty-text">No product sales data</p>
                  </div>
                </div>
              ) }
            </div>
          </div>
        </div>

        <div className="dashboard-chart-card dashboard-chart-card-tan">
          <div className="dashboard-chart-card-header">
            <h5 className="dashboard-chart-card-title">
              <Star className="dashboard-chart-card-icon" />
              Top Reviews
            </h5>
          </div>
          <div className="dashboard-chart-card-body">
            <div className="dashboard-chart-container">
              { dashboardData.topReviewedProducts?.length > 0 ? (
                <ResponsiveContainer width="100%" height={ 300 }>
                  <PieChart>
                    <Pie
                      data={ dashboardData.topReviewedProducts }
                      cx="50%"
                      cy="50%"
                      labelLine={ true }
                      outerRadius={ 80 }
                      fill="#8884d8"
                      dataKey="reviews"
                      nameKey="name"
                      label={ ({ name, reviews }) => `${name} (${reviews})` }
                    >
                      { dashboardData.topReviewedProducts.map((entry, index) => (
                        <Cell key={ `cell-${index}` } fill={ COFFEE_COLORS[index % COFFEE_COLORS.length] } />
                      )) }
                    </Pie>
                    <Tooltip
                      contentStyle={ {
                        backgroundColor: '#FFF9F2',
                        border: '1px solid #E6C7A1',
                        borderRadius: '8px',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                        fontSize: '0.9rem',
                        color: '#5E403F',
                      } }
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="dashboard-chart-empty">
                  <div className="dashboard-chart-empty-content">
                    <Star className="dashboard-chart-empty-icon" />
                    <p className="dashboard-chart-empty-text">No review data available</p>
                  </div>
                </div>
              ) }
            </div>
          </div>
        </div>

        <div className="dashboard-chart-card dashboard-chart-card-lightbrown">
          <div className="dashboard-chart-card-header">
            <h5 className="dashboard-chart-card-title">
              <Clock className="dashboard-chart-card-icon" />
              Peak Hours
            </h5>
          </div>
          <div className="dashboard-chart-card-body">
            <div className="dashboard-chart-container">
              { dashboardData.timeOfDaySales?.length > 0 && salesFilter === 'daily' ? (
                <ResponsiveContainer width="100%" height={ 300 }>
                  <BarChart
                    data={ dashboardData.timeOfDaySales }
                    margin={ { top: 10, right: 20, bottom: 30, left: 20 } }
                  >
                    <CartesianGrid strokeDasharray="3 3" className="dashboard-chart-grid" />
                    <XAxis
                      dataKey="hour"
                      className="dashboard-chart-axis"
                      tick={ { fontSize: 12 } }
                      angle={ -45 }
                      textAnchor="end"
                      height={ 60 }
                    />
                    <YAxis
                      yAxisId="left"
                      className="dashboard-chart-axis"
                      tickFormatter={ formatNumber }
                      tick={ { fontSize: 12 } }
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      className="dashboard-chart-axis"
                      tickFormatter={ formatNumber }
                      tick={ { fontSize: 12 } }
                    />
                    <Tooltip
                      contentStyle={ {
                        backgroundColor: '#FFF9F2',
                        border: '1px solid #E6C7A1',
                        borderRadius: '8px',
                        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                        fontSize: '0.9rem',
                        color: '#5E403F',
                      } }
                      formatter={ (value, name, props) => [
                        name === 'sales' ? formatCurrency(value) : value,
                        `${props.payload.name}: ${name === 'sales' ? 'Sales' : 'Orders'}`,
                      ] }
                    />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="sales"
                      fill="#A67B60"
                      radius={ [4, 4, 0, 0] }
                      name="Sales"
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="orders"
                      fill="#2ec4b6"
                      radius={ [4, 4, 0, 0] }
                      name="Orders"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="dashboard-chart-empty">
                  <div className="dashboard-chart-empty-content">
                    <Clock className="dashboard-chart-empty-icon" />
                    <p className="dashboard-chart-empty-text">
                      { salesFilter === 'daily' ? 'No peak hours data' : 'Peak hours available for Daily filter only' }
                    </p>
                  </div>
                </div>
              ) }
            </div>
          </div>
        </div>
      </div>

      {/* Orders Section */ }
      <div className="dashboard-orders-section">
        <div className="dashboard-orders-card">
          <div className="dashboard-orders-header">
            <h5 className="dashboard-orders-title">
              <List className="dashboard-orders-title-icon" />
              Recent Orders
            </h5>
            <Link to="/orders" className="dashboard-orders-view-all">
              View All
              <ArrowRight className="dashboard-orders-view-all-icon" />
            </Link>
          </div>
          <div className="dashboard-orders-body">
            <div className="dashboard-orders-table-container">
              <table className="dashboard-orders-table">
                <thead>
                  <tr>
                    <th className="dashboard-orders-th">Order #</th>
                    <th className="dashboard-orders-th">Customer</th>
                    <th className="dashboard-orders-th">Date</th>
                    <th className="dashboard-orders-th">Amount</th>
                    <th className="dashboard-orders-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  { dashboardData.recentOrders?.length > 0 ? (
                    dashboardData.recentOrders.map((order) => (
                      <tr key={ order.order_id } className="dashboard-orders-tr">
                        <td className="dashboard-orders-td">
                          <Link to={ `/orders/${order.order_id}` } className="dashboard-orders-link">
                            #{ order.order_number }
                          </Link>
                        </td>
                        <td className="dashboard-orders-td">{ order.customer_name || 'Guest' }</td>
                        <td className="dashboard-orders-td">{ new Date(order.order_date).toLocaleDateString() }</td>
                        <td className="dashboard-orders-td">{ formatCurrency(order.total_amount) }</td>
                        <td className="dashboard-orders-td">{ renderStatusBadge(order.status) }</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="dashboard-orders-empty">
                      <td colSpan={ 5 } className="dashboard-orders-empty-content">
                        <Inbox className="dashboard-orders-empty-icon" />
                        No recent orders
                      </td>
                    </tr>
                  ) }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
