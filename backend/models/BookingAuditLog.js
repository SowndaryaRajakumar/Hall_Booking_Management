/**
 * Sequelize Model Definition for BookingAuditLog.
 *
 * Tracks every state change and user action on bookings:
 * - BOOKING_CREATED
 * - BOOKING_APPROVED
 * - BOOKING_REJECTED
 * - BOOKING_CANCELLED
 * - BOOKING_UPDATED
 * - BOOKING_RESCHEDULED
 */

module.exports = (sequelize, DataTypes) => {
  if (!sequelize || !DataTypes) {
    return {
      tableName: 'booking_audit_logs',
      attributes: {
        id: { type: 'INTEGER', primaryKey: true, autoIncrement: true },
        booking_id: { type: 'INTEGER', allowNull: false },
        user_id: { type: 'INTEGER', allowNull: false },
        action: { type: 'STRING', allowNull: false },
        old_status: { type: 'STRING', allowNull: true },
        new_status: { type: 'STRING', allowNull: true },
        details: { type: 'TEXT', allowNull: true },
        created_at: { type: 'DATE' },
      },
    };
  }

  const BookingAuditLog = sequelize.define(
    'BookingAuditLog',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      booking_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'bookings',
          key: 'id',
        },
        onDelete: 'CASCADE',
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
      action: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      old_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      new_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },
      details: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'booking_audit_logs',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      indexes: [
        { fields: ['booking_id'] },
        { fields: ['user_id'] },
        { fields: ['action'] },
        { fields: ['created_at'] },
      ],
    }
  );

  BookingAuditLog.associate = (models) => {
    if (models.Booking) {
      BookingAuditLog.belongsTo(models.Booking, { foreignKey: 'booking_id', as: 'booking' });
    }
    if (models.Staff) {
      BookingAuditLog.belongsTo(models.Staff, { foreignKey: 'user_id', as: 'user' });
    }
  };

  return BookingAuditLog;
};
