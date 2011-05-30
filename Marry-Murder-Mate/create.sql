CREATE DATABASE mmm;

USE mmm;

CREATE TABLE mmm_votes (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  added TIMESTAMP DEFAULT NOW(),
  voter_id BIGINT,
  user1_id BIGINT,
  vote1 ENUM('Marry', 'Murder', 'Mate'),
  user2_id BIGINT,
  vote2 ENUM('Marry', 'Murder', 'Mate'),
  user3_id BIGINT,
  vote3 ENUM('Marry', 'Murder', 'Mate'),
  INDEX(voter_id),
  INDEX(user1_id),
  INDEX(user2_id),
  INDEX(user3_id)
);

ALTER TABLE mmm_votes ADD UNIQUE(voter_id, user1_id, user2_id, user3_id);
