class CreateModels < ActiveRecord::Migration[6.1]
  def change
    create_table :squares do |t|
      t.string :idx, null: false, default: ""
      t.string :img
      t.string :msg
      t.string :url
      t.integer :x
      t.integer :y
      t.string :traits, array: true
      t.string :the_type

      t.timestamps
    end

    add_index :squares, :idx, unique: true

    create_table :metadatas do |t|
      t.string :transaction_id
    end
  end
end
