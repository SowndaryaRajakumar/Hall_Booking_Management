/**
 * Sequelize Model Definition for Notification.
 *
 * This file documents and exports the Sequelize model definition matching
 * the database schema for the `notifications` table.
 *
 * Relationships:
 * User 1 ---- * Notifications (staff_id -> user_id)
 * Booking 1 ---- * Notifications (id -> related_booking_id)
 */

module.exports = (sequelize, DataTypes) => {
  if (!sequelize || !DataTypes) {
    // If Sequelize is not initialized in the host environment, return schema definition object
    return {
      tableName: 'notifications',
      attributes: {
        id: { type: 'INTEGER', primaryKey: true, autoIncrement: true },
        user_id: { type: 'INTEGER', allowNull: false },
        title: { type: 'STRING', allowNull: false },
        message: { type: 'TEXT', allowNull: false },
        type: { type: 'STRING', allowNull: false, defaultValue: 'booking_update' },
        related_booking_id: { type: 'INTEGER', allowNull: true },
        is_read: { type: 'BOOLEAN', allowNull: false, defaultValue: false },
        created_at: { type: 'DATE' },
        updated_at: { type: 'DATE' },
      },
    };
  }

  const Notification = sequelize.define(
    'Notification',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
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
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'booking_update',
      },
      related_booking_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'bookings',
          key: 'id',
        },
        onDelete: 'SET NULL',
      },
      is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      tableName: 'notifications',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        { fields: ['user_id', 'is_read'] },
        { fields: ['user_id', 'created_at'] },
        { fields: ['related_booking_id'] },
      ],
    }
  );

  Notification.associate = (models) => {
    if (models.Staff) {
      Notification.belongsTo(models.Staff, { foreignKey: 'user_id', as: 'user' });
    }
    if (models.Booking) {
      Notification.belongsTo(models.Booking, { foreignKey: 'related_booking_id', as: 'booking' });
    }
  };

  return Notification;
};
