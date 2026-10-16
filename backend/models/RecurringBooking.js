/**
 * Sequelize Model Definition for RecurringBooking.
 *
 * Tracks recurring booking schedules:
 * - Start date to End date
 * - Selected weekdays
 * - Period / Time range
 * - Occurrences count
 */

module.exports = (sequelize, DataTypes) => {
  if (!sequelize || !DataTypes) {
    return {
      tableName: 'recurring_bookings',
      attributes: {
        id: { type: 'INTEGER', primaryKey: true, autoIncrement: true },
        recurring_group_id: { type: 'STRING', allowNull: false, unique: true },
        user_id: { type: 'INTEGER', allowNull: false },
        hall_id: { type: 'INTEGER', allowNull: false },
        hall_name: { type: 'STRING', allowNull: false },
        start_date: { type: 'DATEONLY', allowNull: false },
        end_date: { type: 'DATEONLY', allowNull: false },
        weekdays: { type: 'STRING', allowNull: false },
        period_number: { type: 'INTEGER', allowNull: true },
        time_from: { type: 'TIME', allowNull: false },
        time_to: { type: 'TIME', allowNull: false },
        total_occurrences: { type: 'INTEGER', allowNull: false },
        created_occurrences: { type: 'INTEGER', allowNull: false },
        purpose: { type: 'TEXT', allowNull: false },
        remarks: { type: 'TEXT', allowNull: true },
        status: { type: 'STRING', allowNull: false, defaultValue: 'Active' },
        created_at: { type: 'DATE' },
        updated_at: { type: 'DATE' },
      },
    };
  }

  const RecurringBooking = sequelize.define(
    'RecurringBooking',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      recurring_group_id: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'staff',
          key: 'staff_id',
        },
        onDelete: 'CASCADE',
      },
      hall_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'halls',
          key: 'HallID',
        },
        onDelete: 'CASCADE',
      },
      hall_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      weekdays: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      period_number: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      time_from: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      time_to: {
        type: DataTypes.TIME,
        allowNull: false,
      },
      total_occurrences: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      created_occurrences: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      purpose: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      remarks: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'Active',
      },
    },
    {
      tableName: 'recurring_bookings',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        { fields: ['recurring_group_id'] },
        { fields: ['user_id'] },
        { fields: ['hall_id'] },
      ],
    }
  );

  RecurringBooking.associate = (models) => {
    if (models.Staff) {
      RecurringBooking.belongsTo(models.Staff, { foreignKey: 'user_id', as: 'user' });
    }
    if (models.Hall) {
      RecurringBooking.belongsTo(models.Hall, { foreignKey: 'hall_id', as: 'hall' });
    }
    if (models.Booking) {
      RecurringBooking.hasMany(models.Booking, { foreignKey: 'recurring_group_id', sourceKey: 'recurring_group_id', as: 'bookings' });
    }
  };

  return RecurringBooking;
};
